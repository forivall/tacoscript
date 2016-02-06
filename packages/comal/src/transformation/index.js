/* @noflow */
/* global BabelParserOptions */
/* global BabelFileMetadata */
/* global BabelFileResult */

import getHelper from "babel-helpers";
import * as metadataVisitor from "./metadata";
import convertSourceMap from "convert-source-map";
import OptionLoader from "../options/loader";
import type Pipeline from "../pipeline";
import PluginPass from "../plugin-pass";
import shebangRegex from "shebang-regex";
import traverse, { NodePath, Hub, Scope } from "comal-traverse";
import sourceMap from "source-map";
import generate from "babel-generator";
import codeFrame from "babel-code-frame";
import defaults from "lodash/defaults";
import Logger from "./logger";
import Store from "../../store";
import { parse } from "babylon";
import * as util from  "../../util";
import path from "path";
import * as t from "comal-types";
import pick from "lodash/pick";
import File from "../file";

import blockHoistPlugin from "../internal-plugins/block-hoist";
import shadowFunctionsPlugin from "../internal-plugins/shadow-functions";

const INTERNAL_PLUGINS = [
  [blockHoistPlugin],
  [shadowFunctionsPlugin]
];

export default class Transformation {
  constructor(meta, opts: Object = {}, pipeline: Pipeline) {
    this.store = new Store();

    this.pipeline = pipeline;

    this.log  = new Logger(this, opts.filename || "unknown");
    this.opts = this.initOptions(optMeta, opts);

    this.parserOpts = {
      highlightCode: this.opts.highlightCode,
      nonStandard:   this.opts.nonStandard,
      sourceType:    this.opts.sourceType,
      filename:      this.opts.filename,
      plugins:       []
    };

    this.pluginVisitors = [];
    this.pluginPasses = [];

    // Plugins for top-level options.
    this.buildPluginsForOptions(this.opts);

    // If we are in the "pass per preset" mode, build
    // also plugins for each preset.
    if (this.opts.passPerPreset) {
      // All the "per preset" options are inherited from the main options.
      this.perPresetOpts = [];
      this.opts.presets.forEach(presetOpts => {
        let perPresetOpts = Object.assign(Object.create(this.opts), presetOpts);
        this.perPresetOpts.push(perPresetOpts);
        this.buildPluginsForOptions(perPresetOpts);
      });
    }
  }

  static helpers: Array<string>;

  pluginVisitors: Array<Object>;
  pluginPasses: Array<PluginPass>;
  pipeline: Pipeline;
  parserOpts: BabelParserOptions;
  log: Logger;

  // proxy store
  get(key) { return this.store.get(key); }
  set(key, value) { return this.store.set(key, value); }
  setDynamic(key, value) { return this.store.setDynamic(key, value); }

  initOptions(optMeta, opts) {
    opts = new OptionLoader(optMeta, this.log).load(opts);

    opts.ignore = util.arrayify(opts.ignore, util.regexify);

    if (opts.only) opts.only = util.arrayify(opts.only, util.regexify);

    return opts;
  }

  buildPluginsForOptions(opts) {
    if (!Array.isArray(opts.plugins)) {
      return;
    }

    let plugins: Array<[PluginPass, Object]> = opts.plugins.concat(INTERNAL_PLUGINS);
    let currentPluginVisitors = [];
    let currentPluginPasses = [];

    // init plugins!
    for (let ref of plugins) {
      let [plugin, pluginOpts] = ref; // todo: fix - can't embed in loop head because of flow bug

      currentPluginVisitors.push(plugin.visitor);
      currentPluginPasses.push(new PluginPass(this, plugin, pluginOpts));

      if (plugin.manipulateOptions) {
        plugin.manipulateOptions(opts, this.parserOpts, this);
      }
    }

    this.pluginVisitors.push(currentPluginVisitors);
    this.pluginPasses.push(currentPluginPasses);
  }

  getModuleName(file): ?string {
    return file.getModuleName(opts.getModuleId);
  }

  resolveModuleSource(file, source: string): string {
    let resolveModuleSource = this.opts.resolveModuleSource;
    if (resolveModuleSource) source = resolveModuleSource(source, file.filename);
    return source;
  }

  parse(file: File) {
    this.log.debug("Parse start");
    let ast = parse(file.code, this.parserOpts);
    this.log.debug("Parse stop");
    return ast;
  }

  setAst(file: File, ast) {
    this.log.debug("Start set AST");
    file.setAst(ast);
    this.log.debug("End set AST");
  }

  transform(file: File): BabelFileResult {
    // In the "pass per preset" mode, we have grouped passes.
    // Otherwise, there is only one plain pluginPasses array.
    this.pluginPasses.forEach((pluginPasses, index) => {
      this.call("pre", file, pluginPasses);
      this.log.debug(`Start transform traverse`);
      traverse(this.ast, traverse.visitors.merge(this.pluginVisitors[index], pluginPasses), this.scope);
      this.log.debug(`End transform traverse`);
      this.call("post", pluginPasses);
    });

    return this.generate();
  }

  wrap(code: string, callback: Function): BabelFileResult {
    code = code + "";

    try {
      if (this.shouldIgnore()) {
        return this.makeResult({ code, ignored: true });
      } else {
        return callback();
      }
    } catch (err) {
      if (err._babel) {
        throw err;
      } else {
        err._babel = true;
      }

      let message = err.message = `${this.opts.filename}: ${err.message}`;

      let loc = err.loc;
      if (loc) {
        err.codeFrame = codeFrame(code, loc.line, loc.column + 1, this.opts);
        message += "\n" + err.codeFrame;
      }

      if (process.browser) {
        // chrome has it's own pretty stringifier which doesn't use the stack property
        // https://github.com/babel/babel/issues/2175
        err.message = message;
      }

      if (err.stack) {
        let newStack = err.stack.replace(err.message, message);
        err.stack = newStack;
      }

      throw err;
    }
  }

  addCode(code: string) {
    code = (code || "") + "";
    code = this.parseInputSourceMap(code);
    this.code = code;
  }

  parse(file: File) {
    this.parseShebang();
    let ast = this.parse(file);
    this.setAst(ast);
  }

  shouldIgnore(file: File) {
    let opts = this.opts;
    return util.shouldIgnore(file.filename, opts.ignore, opts.only);
  }

  call(key: "pre" | "post", file: File, pluginPasses: Array<PluginPass>) {
    for (let pass of pluginPasses) {
      let plugin = pass.plugin;
      let fn = plugin[key];
      if (fn) fn.call(pass, this);
    }
  }

  parseInputSourceMap(code: string): string {
    let opts = this.opts;

    if (opts.inputSourceMap !== false) {
      let inputMap = convertSourceMap.fromSource(code);
      if (inputMap) {
        opts.inputSourceMap = inputMap.toObject();
        code = convertSourceMap.removeComments(code);
      }
    }

    return code;
  }

  parseShebang() {
    let shebangMatch = shebangRegex.exec(this.code);
    if (shebangMatch) {
      this.shebang = shebangMatch[0];
      this.code = this.code.replace(shebangRegex, "");
    }
  }

  makeResult({ code, map, ast, ignored } /*: BabelFileResult */): BabelFileResult {
    let result = {
      metadata: null,
      options:  this.opts,
      ignored:  !!ignored,
      code:     null,
      ast:      null,
      map:      map || null
    };

    if (this.opts.code) {
      result.code = code;
    }

    if (this.opts.ast) {
      result.ast = ast;
    }

    if (this.opts.metadata) {
      result.metadata = this.metadata;
    }

    return result;
  }

  generate(file: File): BabelFileResult {
    let ast  = this.ast;

    let result: BabelFileResult = { ast };
    if (!this.opts.code) return this.makeResult(result);

    let opts = pick(this.opts, [
      "filename",
      "retainLines",
      "comments",
      "compact",
      "minified",
      "concise",
      "quotes",
      "sourceMaps",
      "sourceRoot",
      "sourceFileName",
      "sourceMapTarget",
      "auxiliaryCommentBefore",
      "auxiliaryCommentAfter",
      "shouldPrintComment",
    ]);

    this.log.debug("Generation start");

    let _result = generate(ast, opts, this.code);
    result.code = _result.code;
    result.map  = _result.map;

    this.log.debug("Generation end");

    if (this.shebang) {
      // add back shebang
      result.code = `${this.shebang}\n${result.code}`;
    }

    if (result.map) {
      result.map = this.mergeSourceMap(result.map);
    }

    if (opts.sourceMaps === "inline" || opts.sourceMaps === "both") {
      result.code += "\n" + convertSourceMap.fromObject(result.map).toComment();
    }

    if (opts.sourceMaps === "inline") {
      result.map = null;
    }

    return this.makeResult(result);
  }
}

export { File };
