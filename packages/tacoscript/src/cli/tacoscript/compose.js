import subarg from "subarg";

import {coreOptions} from "comal";

import usage from "./_usage";
import usageAdvanced from "./_usageForComalOpts";

import argsWithComalOpts from "./_convertComalOpts";

import includes from "lodash/includes";
import omit from "lodash/omit";
import map from "lodash/map";
import flatten from "lodash/flatten";
import camelize from "camelize";

export default function(argv, parentArgs, cb) {
  if (includes(argv, "--help") || includes(argv, "-h")) {
    if (subarg(argv, {alias: {"help": ["h"]}}).help === "advanced") {
      return usageAdvanced(coreOptions, cb);
    } else {
      return usage("compose", cb);
    }
  }

  let argConf = argsWithComalOpts(coreOptions, {
    boolean: ["watch", "quiet", "no-dotfiles", "dir"],
    string: ["outfile", "extensions"],
    default: omit(parentArgs, "_"),
    alias: {
      "outfile": ["o"],
      "dir": ["d"],
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

  const outfiles = argv.outfile == null ? [] : [].concat(argv.outfile);
  const useStdout = outfiles.length === 0;

  if (args.verbose) console.warn("will convert", useStdin ? '<stdin>' : infiles, "to", useStdout ? '<stdout>' : outfiles);

  // TODO: match up inputs to outputs
  // TODO: run conversion

  cb();
}
