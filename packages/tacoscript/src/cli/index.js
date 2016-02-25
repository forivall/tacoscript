#!/usr/bin/env node

import minimist from "minimist";
import usage from "./_usage";

import omit from "lodash/omit";

import baseArgs from "./base-args";

export default function(argv, processExit) {
  const args = minimist(argv, {
    ...baseArgs,
    // The first non-option argument is the subcommand:
    stopEarly: true
  });

  if (args["debug-internal"]) require("source-map-support").install();

  let forcedError = false;
  const exit = function(e) {
    if (e && e.message) {
      console.error(e.message);
    }
    if (forcedError) processExit(1);
    else setImmediate(function() {
      processExit(e ? (typeof e.code === "number" ? e.code : 1) : forcedError ? 1 : 0);
    });
  }

  if (args._[0] === "help" || args.help) {
    let whichHelp = args.help ? args.help : args._[1];
    if (whichHelp === true) whichHelp = false;
    return usage(whichHelp, exit);
  }

  if (args.version) {
    console.log(require("../../package.json").version);
    return;
  }

  if (args.versions) {
    return require("./commands/version")({}, [], exit);
  }

  // launch repl by default
  if (args._.length === 0) args._.push("node-repl");

  const subcommand = args._[0];

  if (subcommand === "index" || subcommand[0] === "_") {
    console.warn("Unknown command\n");
    forcedError = true;
    return usage(false, exit);
  }

  let subcommandFn;
  try {
    subcommandFn = require("./commands/" + subcommand);
    if (subcommandFn.__esModule) subcommandFn = subcommandFn.default;
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND" && e.message === `Cannot find module './commands/${subcommand}'`) {
      console.warn(`Unknown command '${subcommand}'\n`);
      forcedError = true;
      return usage(false, exit);
    }
    else throw e;
  }

  return subcommandFn(omit(args, "_"), args._.slice(1), exit);
}
