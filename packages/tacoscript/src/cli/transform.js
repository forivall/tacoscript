import fs from "fs";

import camelize from "camelize";
import {coreOptions as comalCoreOptions} from "comal";
const comalCoreOptionNames = Object.keys(comalCoreOptions);
import isGlob from "is-glob";
import cloneDeep from "lodash/cloneDeep";
import includes from "lodash/includes";
import omit from "lodash/omit";
import map from "lodash/map";
import pick from "lodash/pick";
import subarg from "subarg";

import usage from "./usage";
import usageAdvanced from "./usage/comal";

import baseArgs from "./base-args";
import argsWithComalOpts from "./convertComalOpts";
import convertPluginOpts from "./convertPluginOpts";
import stdin from "./stdin";
import stdout from "./stdout";
import transformTree from "./transformTree";
import watchTree from "./watchTree";

export default class TransformCli {
  constructor(defaults = {}) {
    this.name = "unknown";
    this.logger = console;
    this.defaults = omit(defaults, "_");
    this.opts = cloneDeep(baseArgs);
    // TODO: collect unknown arguments in a separate object as args to pass to comal
    // this.opts.unknown;

    this.opts.boolean.push("watch", "quiet", "verbose", "serial");
    this.opts.string.push("outfile", "extensions");
    this.opts.alias["outfile"] = ["o"];
    this.opts.alias["watch"] = ["w"];
    this.opts.alias["extensions"] = ["x"];
    this.opts.alias["plugin"] = ["p"];
    this.opts.alias["generator"] = ["g"];
    this.args = {}
  }

  transformSync(code, opts) {
    // This method should be overridden by a subclass or instance
    return {code: code, opts: opts};
  }

  prepare() {
    // This method should be overridden by a subclass or instance
  }

  transformFile(file, opts, cb) {
    // This method should be overridden by a subclass or instance
    fs.readFile(file, opts, cb);
  }

  debug(...args) {
    if (this.args.verbose) this.logger.warn(...args);
  }

  log(...args) {
    if (!this.args.quiet) this.logger.log(...args);
  }

  parseArgs(argv) {
    const comalUnknownOptionNames = [];
    const args = this.args = subarg(argv, argsWithComalOpts(comalCoreOptions, {
      ...this.opts,
      default: {...this.defaults, ...this.opts.default},
      unknown: (arg) => {
        const match = /^--([^=]+)=/.exec(arg) || /^--(?:no-)(.+)/.exec(arg);
        if (match) comalUnknownOptionNames.push(match[1]);
      }
    }));
    this.comalOpts = camelize(pick(args, comalCoreOptionNames, comalUnknownOptionNames));
  }

  run(argv, cb) {
    if (includes(argv, "--help") || includes(argv, "-h")) {
      if (subarg(argv, {alias: {"help": ["h"]}}).help === "advanced") {
        return usageAdvanced(comalCoreOptions, cb);
      } else {
        return usage(this.name, cb);
      }
    }

    this.parseArgs(argv);
    const args = this.args;

    // normalize input arguments
    this.infiles = args._;
    const useStdin = this.infiles.length === 0;

    // normalize output arguments
    this.outfiles = args.outfile == null ? [] : [].concat(args.outfile);
    const useStdout = this.outfiles.length === 0;

    // normalize arguments to pass to a comal api
    const comalOpts = this.comalOpts;

    if (args.plugin) {
      try { comalOpts.plugins = convertPluginOpts(args.plugin) }
      catch (e) { return cb(e); }
    }

    if (args.extensions && !useStdin) {
      comalOpts.only = (comalOpts.only ? comalOpts.only + "," : "") +
        map(args.extensions.split(","), (e) => "*" + e).join(",");
    }

    this.debug("will convert", useStdin ? '<stdin>' : this.infiles, "to", useStdout ? '<stdout>' : this.outfiles);

    if (useStdin || useStdout) {
      return this.runStdio(cb);
    }
    return this.runFiles(cb);
  }

  runStdio(cb) {
    const args = this.args;

    if (args.watch) return cb(new Error("Cannot use watch with stdio"));

    const useStdin = this.infiles.length === 0;
    const useStdout = this.outfiles.length === 0;

    if (useStdin) {
      // TODO: error if sourcemaps is true, i.e. is requested as a separate file.
    }
    if (useStdout && !useStdin && (this.infiles.length > 1 || isGlob(this.infiles[0]))) {
      return cb(new Error("Cannot use more than one input file with stdout"));
    }
    if (useStdin && !useStdout && this.infiles.length > 1) {
      return cb(new Error("Cannot write to more than one output file with stdin"));
    }

    // do the work
    const read = useStdin ? stdin : (cb) => { fs.readFile(this.infiles[0], 'utf8', cb) };
    const write = useStdout ? stdout : (data, cb) => { fs.writeFile(this.outfiles[0], data, 'utf8', cb); };

    if (!useStdin && !this.comalOpts.filename) {
      this.comalOpts.filename = this.infiles[0];
    }

    read((err, data) => {
      if (err) {
        if (err.code === "EISDIR") {
          return cb(new Error("Cannot use a directory as input with stdout"));
        }
        return cb(err)
      }

      write(this.transformSync(data, this.comalOpts).code, cb);
    });
  }

  runFiles(cb) {
    const args = this.args;

    if (this.outfiles.length !== 1 && this.outfiles.length !== this.infiles.length) {
      return cb(new Error("Number of input files must equal number of output files, or output to a directory"));
    }

    this.prepare();

    // TODO: move watch and transform into this class
    if (args.watch) {
      watchTree(this.transformFile.bind(this), {src: this.infiles, dest: this.outfiles, destExt: ".js"}, {args, only: this.comalOpts.only}, cb);
    } else {
      transformTree(this.transformFile.bind(this), {src: this.infiles, dest: this.outfiles, destExt: ".js"}, {args, only: this.comalOpts.only}, cb);
    }
  }
}
