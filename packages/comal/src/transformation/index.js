/* @noflow */
/* global FileResult */

import convertSourceMap from "convert-source-map";
import OptionsLoader from "../options/loader";
import type Pipeline from "./pipeline";
import PluginPass from "./plugin-pass";
import traverse from "comal-traverse";
import codeFrame from "babel-code-frame";
import defaults from "lodash/defaults";
import Logger from "../logger";
import msg from "../messages";
import Store from "../store";
import * as util from  "../util";
import pick from "lodash/pick";
import isArray from "lodash/isArray";
import isFunction from "lodash/isFunction";
import File from "../file";

import blockHoistPlugin from "./internal-visitor-plugins/block-hoist";
import shadowFunctionsPlugin from "./internal-visitor-plugins/shadow-functions";

const INTERNAL_VISITOR_PLUGINS = [
  [blockHoistPlugin],
  [shadowFunctionsPlugin]
];

function cleanMeta(meta: {
  parser?: {parse: Function},
  parserOpts?: Object|Function,
  generator?: {generate: Function},
  generatorOpts?: Object|Function,
  visitor: string,
}) {
  meta = {...meta};
  if (meta.parse == null) meta.parse = meta.parser != null;
  if (meta.generate == null) meta.generate = meta.generator != null;
  if (meta.parse) {
    if (meta.parser == null) throw new Error(msg("missingProperty", "meta", "parser"));
    if (meta.parserOpts == null) meta.parserOpts = {};
  }
  if (meta.generate) {
    if (meta.generator == null) throw new Error(msg("missingProperty", "meta", "generator"));
    if (meta.generatorOpts == null) meta.generatorOpts = {};
  }
  return meta;
}

export default class Transformation {
  constructor(meta, opts: Object = {}, pipeline: Pipeline, context?) {
    this.store = new Store();

    meta = cleanMeta(meta);

    this.pipeline = pipeline;

    this.log  = new Logger(opts);
    this.opts = this.initOptions(meta, opts, context);

    if (meta.parse) {
      this.parser = meta.parser;

      this.parserOpts = isFunction(meta.parserOpts)
        ? meta.parserOpts(this.opts, this, context)
        : {...meta.parserOpts};

    } else this.parser = false;

    if (meta.generate) {
      this.generator = meta.generator;

      this.generatorOpts = isFunction(meta.generatorOpts)
        ? meta.generatorOpts(this.opts, this, context)
        : {...meta.generatorOpts};


    } else this.generator = false;

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
  parserOpts: Object;
  log: Logger;

  // proxy store
  get(key) { return this.store.get(key); }
  set(key, value) { return this.store.set(key, value); }
  setDynamic(key, value) { return this.store.setDynamic(key, value); }

  initOptions(meta, opts, context?) {
    opts = new OptionsLoader(meta, this.log, context).load(opts);

    opts.ignore = util.arrayify(opts.ignore, util.regexify);

    if (opts.only) opts.only = util.arrayify(opts.only, util.regexify);

    this.log.config(opts);

    return opts;
  }

  buildPluginsForOptions(opts) {
    if (!Array.isArray(opts.plugins)) {
      return;
    }

    let plugins: Array<[PluginPass, Object]> = opts.plugins;
    plugins = plugins.concat(INTERNAL_VISITOR_PLUGINS);

    let currentPluginVisitors = [];
    let currentPluginPasses = [];

    // init plugins!
    for (let ref of plugins) {
      let [plugin, pluginOpts] = ref; // todo: fix - can't embed in loop head because of flow bug

      currentPluginVisitors.push(plugin.visitor);
      currentPluginPasses.push(new PluginPass(this, plugin, pluginOpts));

      // TODO: more init options from meta.
      if (plugin.manipulateOptions) {
        const result = plugin.manipulateOptions(opts, this.parserOpts, this);
        if (result != null) {
          opts = result;
        }
      }
    }

    this.pluginVisitors.push(currentPluginVisitors);
    this.pluginPasses.push(currentPluginPasses);

    return opts;
  }

  parse(file: File, setAst = true) {
    this.log.debug("Parse start");
    let ast = this.parser.parse(file.code, this.parserOpts);
    this.log.debug("Parse stop");
    if (setAst) this.setAst(file, ast);
    return ast;
  }

  setAst(file: File, ast) {
    this.log.debug("Start set AST");
    file.setAst(ast);
    this.log.debug("End set AST");
  }

  transform(file: File): FileResult {
    // In the "pass per preset" mode, we have grouped passes.
    // Otherwise, there is only one plain pluginPasses array.
    this.pluginPasses.forEach((pluginPasses, index) => {
      for (let pass of (pluginPasses: Array<PluginPass>)) {
        pass.open(file);
      }

      this.call("pre", file, pluginPasses);
      this.log.debug(`Start transform traverse`);

      traverse(file.ast, traverse.visitors.merge(this.pluginVisitors[index], pluginPasses), file.scope);

      this.log.debug(`End transform traverse`);
      this.call("post", file, pluginPasses);

      for (let pass of (pluginPasses: Array<PluginPass>)) {
        pass.close();
      }
    });
    return this.generate(file);
  }

  runWrapped(file: File, inner: Function): FileResult {
    const code = file.code || "";

    try {
      if (this.shouldIgnore(file)) {
        return this.makeResult({ code, ignored: true });
      } else {
        return inner();
      }
    } catch (err) {
      if (err._comal) {
        throw err;
      } else {
        err._comal = true;
      }

      let message = err.message = `${file.filename}: ${err.message}`;

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

  shouldIgnore(file: File) {
    let opts = this.opts;
    return util.shouldIgnore(file.filename, opts.ignore, opts.only);
  }

  call(key: "pre" | "post", file: File, pluginPasses: Array<PluginPass>) {
    for (let pass of pluginPasses) {
      let plugin = pass.plugin;
      let fn = plugin[key];
      if (fn) fn.call(pass, file, this);
    }
  }

  makeResult({ code, map, ast, ignored, metadata } /*: FileResult */): FileResult {
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
      result.metadata = metadata;
    }

    return result;
  }

  generate(file: File): FileResult {
    let ast  = file.ast;

    let result: FileResult = { ast, metadata: file.metadata };
    if (!this.opts.code) return this.makeResult(result);

    if (this.generator) {
      let fileOpts = pick(file, [
        "filename",
        "sourceRoot",
        "sourceFileName",
        "sourceMapTarget",
      ]);
      fileOpts.sourceMaps = file.opts.sourceMaps;

      this.log.debug("Generation start");

      let _result = this.generator.generate(ast, defaults({...this.generatorOpts}, fileOpts), file.code);
      result.code = _result.code;
      result.map  = _result.map;

      this.log.debug("Generation end");

      if (file.shebang) {
        // add back shebang
        result.code = `${file.shebang}\n${result.code}`;
      }
    }

    if (result.map) {
      result.map = file.mergeSourceMap(result.map);
    }

    if (this.generator) {
      if (file.opts.sourceMaps === "inline" || file.opts.sourceMaps === "both") {
        result.code += "\n" + convertSourceMap.fromObject(result.map).toComment();
      }

      if (file.opts.sourceMaps === "inline") {
        result.map = null;
      }
    }

    return this.makeResult(result);
  }
}
