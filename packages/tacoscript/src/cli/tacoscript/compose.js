import fs from "fs";
import path from "path";

import asyncaphore from "asyncaphore";
import limit from "call-limit";
import camelize from "camelize";
import {coreOptions} from "comal";
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
import walk from "./_walk";
import stdin from "./_stdin";
import stdout from "./_stdout";

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
    boolean: ["watch", "quiet", "no-dotfiles", "verbose"],
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

  if (args.extensions && !useStdin) {
    comalArgs.only = (comalArgs.only ? comalArgs.only + "," : "") + map(args.extensions.split(","), (e) => "*" + e).join(",");
  }

  const outfiles = args.outfile == null ? [] : [].concat(args.outfile);
  const useStdout = outfiles.length === 0;

  if (args.verbose) console.warn("will convert", useStdin ? '<stdin>' : infiles, "to", useStdout ? '<stdout>' : outfiles);

  // match up inputs to outputs

  if (useStdin || useStdout) {
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
      if (err) return cb(err)

      write(compose.transform(data, comalArgs).code, cb);
    });

  } else {
    if (outfiles.length !== 1 && outfiles.length !== infiles.length) {
      return cb(new Error("Number of input files must equal number of output files, or output to a directory"));
    }

    let walker;
    const {retain, release, error: cb2} = asyncaphore((err) => {
      if (err) {
        if (walker) walker.abort();
        return cb(err);
      }
      if (args.verbose) console.warn("Done.");
      cb();
    });

    retain();

    const transformer = compose.createTransform(comalArgs);
    const onlyMatch = comalArgs.only && new minimatch.Minimatch(`{${comalArgs.only}}`, {matchBase: true});

    walker = walk({src: infiles, dest: outfiles, destExt: ".js"}, limit((src, dest, done) => {
      // TODO: only filter if we're not copying
      if (onlyMatch && !onlyMatch.match(src)) return done(); // continue;

      retain();

      compose.execFile(transformer, src, /*TODO: sourcemap args*/ (err, data) => {
        if (err) return cb2(err);
        if (data.ignored) {
          // TODO: copy if we should copy ignored files
          done(), release();
          return;
        }
        // TODO: change extname of dest

        mkdirp(path.dirname(dest), (err) => {
          if (err) return cb2(err);

          fs.writeFile(dest, data.code, 'utf8', (err) => {
            if (err) return cb2(err);
            // TODO: write sourcemaps if requested

            if (!args.quiet) console.log(src, "=>", dest);

            done(), release();
          });
        });
      });

      // TODO: copy files

    }, 128 /* limit to 128 parallel calls, = 1/2 osx default max */), (err) => {
      if (err) return cb2(err);
      release();
    })
  }
}
