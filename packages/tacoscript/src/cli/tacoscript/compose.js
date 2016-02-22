import fs from "fs";

import camelize from "camelize";
import {coreOptions} from "comal";
import {dest as globDest} from "glob-pair";
import isGlob from "is-glob";
import includes from "lodash/includes";
import omit from "lodash/omit";
import map from "lodash/map";
import flatten from "lodash/flatten";
import mkdirp from "mkdirp";
import minimatch from "minimatch";
import subarg from "subarg";

import usage from "./_usage";
import usageAdvanced from "./_usageForComalOpts";

import argsWithComalOpts from "./_convertComalOpts";
import stdin from "./_stdin";
import stdout from "./_stdout";
import transformTree from "./_transformTree";
import watchTree from "./_watchTree";

import compose from "../../compose/api";

const nonComalArgs = [
  "debugInternal",
  "help",
  "version",
  "versions",
  "verbose",
  "quiet",

  "outfile",
  "watch",
  "extensions",
  "plugin",
  "generator",
  "serial",

  "dir", "noDotfiles"
]

export default function(argv, parentArgs, cb) {
  if (includes(argv, "--help") || includes(argv, "-h")) {
    if (subarg(argv, {alias: {"help": ["h"]}}).help === "advanced") {
      return usageAdvanced(coreOptions, cb);
    } else {
      return usage("compose", cb);
    }
  }

  let argConf = argsWithComalOpts(coreOptions, {
    boolean: ["watch", "quiet", "no-dotfiles", "verbose", "serial"],
    string: ["outfile", "extensions"],
    default: {extensions: ".taco,.tacos,.tacoscript", ...omit(parentArgs, "_")},
    alias: {
      "debug-internal": ["D"],
      "help": ["h"],
      "version": ["V"],
      "versions": ["VV"],
      "verbose": ["v"],
      "quiet": ["q"],

      "outfile": ["o"],
      "watch": ["w"],
      "extensions": ["x"],
      "plugin": ["p"],
      "generator": ["g"],
    }
  });

  const args = camelize(subarg(argv, argConf));

  // camelize converts "_" to ""
  const infiles = args[""];
  const useStdin = infiles.length === 0;

  // remove arguments that shouldn't be passed into comal
  const comalArgs = omit(args, [""].concat(nonComalArgs, flatten(map(argConf.alias))));

  if (args.plugin) {
    args.plugin = [].concat(args.plugin); // ensure wrapped in array
    try {
      comalArgs.plugins = map(args.plugin, (pluginArg) => {
        if (typeof pluginArg === 'string') {
          return pluginArg;
        }
        if (pluginArg[""].length !== 1) throw new Error("Invalid plugin configuration");
        return [pluginArg[""][0], omit(pluginArg, "")];
      });
    } catch (e) { return cb(e); }
  }

  if (args.extensions && !useStdin) {
    comalArgs.only = (comalArgs.only ? comalArgs.only + "," : "") + map(args.extensions.split(","), (e) => "*" + e).join(",");
  }

  const outfiles = args.outfile == null ? [] : [].concat(args.outfile);
  const useStdout = outfiles.length === 0;

  if (args.verbose) console.warn("will convert", useStdin ? '<stdin>' : infiles, "to", useStdout ? '<stdout>' : outfiles);

  // match up inputs to outputs

  if (useStdin || useStdout) {
    //////// TRANSFORM ONE ////////

    if (args.watch) return cb(new Error("Cannot use watch with stdin or stdout"));

    if (useStdin) {
      // TODO: error if sourcemaps is true, i.e. is requested as a separate file.
    }
    if (useStdout && !useStdin && (infiles.length > 1 || isGlob(infiles[0]))) {
      return cb(new Error("Cannot use more than one input file with stdout"));
    }
    if (useStdin && !useStdout && infiles.length > 1) {
      return cb(new Error("Cannot write to more than one output file with stdin"));
    }

    const read = useStdin ? stdin : (cb) => { fs.readFile(infiles[0], 'utf8', cb) };
    const write = useStdout ? stdout : (data, cb) => { fs.writeFile(outfiles[0], data, 'utf8', cb); };

    if (!useStdin && !comalArgs.filename) {
      comalArgs.filename = infiles[0];
    }

    read((err, data) => {
      if (err) {
        if (err.code === "EISDIR") {
          return cb(new Error("Cannot use a directory as input with stdout"));
        }
        return cb(err)
      }

      write(compose.transform(data, comalArgs).code, cb);
    });

  } else {
    //////// TRANSFORM MANY ////////

    if (outfiles.length !== 1 && outfiles.length !== infiles.length) {
      return cb(new Error("Number of input files must equal number of output files, or output to a directory"));
    }

    const transformer = compose.createTransform(comalArgs);

    const transform = function transform(file, opts, cb) {
      compose.execFile(transformer, file, opts, cb);
    }

    if (args.watch) {
      watchTree(transform, {src: infiles, dest: outfiles, destExt: ".js"}, {args, only: comalArgs.only}, cb);
    } else {
      transformTree(transform, {src: infiles, dest: outfiles, destExt: ".js"}, {args, only: comalArgs.only}, cb);
    }
  }
}
