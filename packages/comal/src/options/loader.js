import type Logger from "../logger";
import Plugin from "../transformation/plugin";

import msg from "../messages";
import resolve from "../helpers/resolve";
import json5 from "json5";
import isAbsolute from "path-is-absolute";
import pathExists from "path-exists";
import cloneDeepWith from "lodash/cloneDeepWith";
import merge from "../helpers/merge";
import path from "path";
import fs from "fs";

import {normalisePlugins} from "../transformation/plugin-normalize";
import {resolvePresets} from "../transformation/presets";

const existsCache = {};
const jsonCache   = {};

function exists(filename) {
  let cached = existsCache[filename];
  if (cached == null) {
    return existsCache[filename] = pathExists.sync(filename);
  } else {
    return cached;
  }
}

import coreConfig from "./core-config";

function cleanMeta(meta) {
  meta = {...meta};
  if (meta.config == null) meta.config = {...coreConfig};
  else meta.config = {...coreConfig, ...meta.config};

  if (meta.loader == null) meta.loader = {};

  if (meta.loader.packageKey) {
    if (meta.loader.packageFileName == null) meta.loader.packageFileName = "package.json";
  }

  if (meta.prefix == null) meta.prefix = false;
  return meta;
}

export default class OptionLoader {
  constructor(meta, log?: Logger) {
    this.meta = cleanMeta(meta);

    this.resolvedConfigs = [];
    this.options = this.createBareOptions();
    this.log = log;
  }

  resolvedConfigs: Array<string>;
  options: Object;
  log: ?Logger;

  createBareOptions() {
    const {config} = this.meta;
    let opts = {};

    for (let key in config) {
      let opt = config[key];
      opts[key] = {...opt.default};
    }

    return opts;
  }

  addConfig(loc: string, key?: string, json = json5): boolean {
    if (this.resolvedConfigs.indexOf(loc) >= 0) {
      return false;
    }

    let content = fs.readFileSync(loc, "utf8");
    let opts;

    try {
      opts = jsonCache[content] = jsonCache[content] || json.parse(content);
      if (key) opts = opts[key];
    } catch (err) {
      err.message = `${loc}: Error while parsing JSON - ${err.message}`;
      throw err;
    }

    this.mergeOptions(opts, this.options, loc, null, path.dirname(loc));
    this.resolvedConfigs.push(loc);

    return !!opts;
  }

  /**
   * This is called when we want to merge the input `opts` into the
   * base options (passed as the `extendingOpts`: at top-level it's the
   * main options, at presets level it's presets options).
   *
   *  - `alias` is used to output pretty traces back to the original source.
   *  - `loc` is used to point to the original config.
   *  - `dirname` is used to resolve plugins relative to it.
   */

  mergeOptions(rawOpts?: Object, extendingOpts?: Object, alias: string = "foreign", loc?: string, dirname?: string) {
    if (!rawOpts) return;

    //
    if (typeof rawOpts !== "object" || Array.isArray(rawOpts)) {
      this.log.error(`Invalid options type for ${alias}`, TypeError);
    }

    //
    let opts = cloneDeepWith(rawOpts, val => {
      if (val instanceof Plugin) {
        return val;
      }
    });

    //
    dirname = dirname || process.cwd();
    loc = loc || alias;

    const {config} = this.meta;
    for (let key in opts) {
      let option = config[key];

      // check for an unknown option
      if (!option && this.log) {
        this.log.error(`Unknown option: ${alias}.${key}`, ReferenceError);
      }
    }

    // normalise options
    this.parseOptions(opts);

    // resolve plugins
    if (opts.plugins) {
      opts.plugins = normalisePlugins(loc, dirname, opts.plugins, this.meta.prefix);
    }

    // add extends clause
    if (opts.extends) {
      let extendsLoc = resolve(opts.extends, dirname);
      if (extendsLoc) {
        this.addConfig(extendsLoc);
      } else {
        if (this.log) this.log.error(`Couldn't resolve extends clause of ${opts.extends} in ${alias}`);
      }
      delete opts.extends;
    }

    // resolve presets
    if (opts.presets) {
      // If we're in the "pass per preset" mode, we resolve the presets
      // and keep them for further execution to calculate the options.
      if (opts.passPerPreset) {
        opts.presets = resolvePresets(opts.presets, dirname, (preset, presetLoc) => {
          this.mergeOptions(preset, preset, presetLoc, presetLoc, dirname);
        });
      } else {
        // Otherwise, just merge presets options into the main options.
        this.mergePresetOptions(opts.presets, dirname);
        delete opts.presets;
      }
    }

    // env
    let envOpts;
    let envKey = process.env.BABEL_ENV || process.env.NODE_ENV || "development";
    if (opts.env) {
      envOpts = opts.env[envKey];
      delete opts.env;
    }

    // Merge them into current extending options in case of top-level
    // options. In case of presets, just re-assign options which are got
    // normalized during the `mergeOptions`.
    if (rawOpts !== extendingOpts) {
      merge(extendingOpts, opts);
    } else {
      Object.assign(extendingOpts, opts);
    }

    // merge in env options
    this.mergeOptions(envOpts, extendingOpts, `${alias}.env.${envKey}`, null, dirname);
  }

  /**
   * Merges all presets into the main options in case we are not in the
   * "pass per preset" mode. Otherwise, options are calculated per preset.
   */
  mergePresetOptions(presets: Array<string | Object>, dirname: string) {
    resolvePresets(presets, dirname, (presetOpts, presetLoc) => {
      this.mergeOptions(
        presetOpts,
        this.options,
        presetLoc,
        presetLoc,
        path.dirname(presetLoc)
      );
    });
  }

  addIgnoreConfig(loc) {
    let file  = fs.readFileSync(loc, "utf8");
    let lines = file.split("\n");

    lines = lines
      .map((line) => line.replace(/#(.*?)$/, "").trim())
      .filter((line) => !!line);

    this.mergeOptions({ ignore: lines }, this.options, loc);
  }

  loadConfigs(loc) {
    const {rcFileName, ignoreFileName, packageFileName, packageKey} = this.meta.loader;

    // no files to load
    if (!(ignoreFileName || rcFileName || packageFileName)) return;

    if (!loc) return;

    if (!isAbsolute(loc)) {
      loc = path.join(process.cwd(), loc);
    }

    let foundConfig = false;
    let foundIgnore = false;

    while (loc !== (loc = path.dirname(loc))) {
      if (!foundConfig) {
        let configLoc = path.join(loc, rcFileName);
        if (exists(configLoc)) {
          this.addConfig(configLoc);
          foundConfig = true;
        }

        let pkgLoc = path.join(loc, packageFileName);
        if (!foundConfig && exists(pkgLoc)) {
          foundConfig = this.addConfig(pkgLoc, packageKey, JSON);
        }
      }

      if (!foundIgnore) {
        let ignoreLoc = path.join(loc, ignoreFileName);
        if (exists(ignoreLoc)) {
          this.addIgnoreConfig(ignoreLoc);
          foundIgnore = true;
        }
      }

      if (foundIgnore && foundConfig) return;
    }
  }

  normaliseOptions() {
    const {config} = this.meta;
    let opts = this.options;

    for (let key in config) {
      let option = config[key];
      let val    = opts[key];

      // optional
      if (!val && option.optional) continue;

      // aliases
      if (option.alias) {
        opts[option.alias] = opts[option.alias] || val;
      } else {
        opts[key] = val;
      }
    }
    return opts;
  }

  // parses options that are still in cli-form
  // TODO: by default, don't use this, for stricter API use. Only should be
  // enabled by an option.
  parseOptions(options: Object = {}): Object {
    const {config} = this.meta;

    for (let key in options) {
      let val = options[key];
      if (val == null) continue;

      let opt = config[key];
      if (opt && opt.alias) opt = config[opt.alias];
      if (!opt) continue;

      let parser = parsers[opt.type];
      if (parser) val = parser(val);

      options[key] = val;
    }

    return options;
  }

  load(opts: Object = {}): Object {
    let filename = opts.filename;

    // merge in base options
    this.mergeOptions(opts, this.options, "base", null, filename && path.dirname(filename));

    // resolve all .babelrc files
    if (this.options.babelrc !== false) {
      this.loadConfigs(filename);
    }

    // normalise
    this.normaliseOptions(opts);

    return this.options;
  }
}
