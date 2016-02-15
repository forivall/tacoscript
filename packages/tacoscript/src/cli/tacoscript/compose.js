import fs from "fs";

import camelize from "camelize";
import {coreOptions} from "comal";
import isGlob from "is-glob";
import includes from "lodash/includes";
import omit from "lodash/omit";
import map from "lodash/map";
import flatten from "lodash/flatten";
import subarg from "subarg";

import usage from "./_usage";
import usageAdvanced from "./_usageForComalOpts";
import argsWithComalOpts from "./_convertComalOpts";
import walk from "./_walk";
import stdin from "./_stdin";
import stdout from "./_stdout";

import compose from "../../compose/api";

export default function(argv, parentArgs, cb) {
  if (includes(argv, "--help") || includes(argv, "-h")) {
    if (subarg(argv, {alias: {"help": ["h"]}}).help === "advanced") {
      return usageAdvanced(coreOptions, cb);
    } else {
      return usage("compose", cb);
    }
  }

  let argConf = argsWithComalOpts(coreOptions, {
    boolean: ["watch", "quiet", "no-dotfiles"],
    string: ["outfile", "extensions"],
    default: omit(parentArgs, "_"),
    alias: {
      "outfile": ["o"],
      "watch": ["w"],
      "extensions": ["x"],
      "plugin": ["p"],
      "generator": ["g"],
      "quiet": ["q"],
      "verbose": ["v"],
    }
  });

  const args = camelize(subarg(argv, argConf));

  // camelize converts "_" to ""
  const infiles = args[""];
  const useStdin = infiles.length === 0;

  const comalArgs = omit(args,
    ["", "outfile", "dir", "watch", "extensions", "plugin", "generator", "quiet", "noDotfiles", "verbose"]
    .concat(flatten(map(argConf.alias))));

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

    read((err, data) => {
      if (err) return cb(err)

      write(compose.transform(data).code, cb);
    })

  } else {
    let _pending = 0, _err;
    const retain = () => { _pending++; };
    const release = () => {
      if (_err) return;
      _pending--;
      if (_pending === 0) {
        if (args.verbose) console.warn("Done.");
        cb();
      } else if (_pending < 0) {
        throw new Error("retain/release mismatch");
      }
    }

    if (outfiles.length !== 1 && outfiles.length !== infiles.length) {
      return cb(new Error("Number of input files must equal number of output files, or output to a directory"));
    }

    retain();
    return walk({src: infiles, dest: outfiles}, (src, dest) => {
      // TODO: run conversion
      if (!args.quiet) console.log(src, "=>", dest);
    }, (err) => {
      if (err) return cb(_err = err);
      release();
    })
  }
}
