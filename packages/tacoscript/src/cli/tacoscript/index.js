#!/usr/bin/env node

import minimist from "minimist";
import usage from "./_usage";

import omit from "lodash/omit";

export default function(argv, processExit) {
  const args = minimist(argv, {
    boolean: ["debug-internal", "version", "versions", "verbose", "quiet"],
    alias: {
      "debug-internal": ["D"],
      "help": ["h"],
      "version": ["V"],
      "versions": ["VV"],
      "verbose": ["v"],
      "quiet": ["q"],
    },
    // The first non-option argument is the subcommand:
    stopEarly: true
  });

  if (args["debug-internal"]) require("source-map-support").install();

  const exit = function(e) {
    if (e && e.message) {
      console.error(e.message);
    }
    setImmediate(function() {
      processExit(e ? (typeof e.code === "number" ? e.code : 1) : 0);
    });
  }

  if (args._[0] === "help" || args.help) {
    let whichHelp = args.help ? args.help : args._[1];
    if (whichHelp === true) whichHelp = false;
    return usage(whichHelp, exit);
  }

  if (args.version) {
    console.log(require("../../../package.json").version);
    return;
  }

  if (args.versions) {
    return require("./version")([], {}, exit);
  }

  // launch repl by default
  if (args._.length === 0) args._.push("node-repl");

  const subcommand = args._[0];

  if (subcommand === "index" || subcommand[0] === "_") {
    console.warn("Unknown command\n");
    return usage(false, exit);
  }

  let subcommandFn;
  try {
    subcommandFn = require("./" + subcommand);
    if (subcommandFn.__esModule) subcommandFn = subcommandFn.default;
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND" && e.message === `Cannot find module './${subcommand}'`) {
      console.warn(`Unknown command '${subcommand}'\n`);
      return usage(false, exit);
    }
    else throw e;
  }

  return subcommandFn(args._.slice(1), omit(args, "_"), exit);
}
