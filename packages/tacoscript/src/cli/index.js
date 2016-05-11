#!/usr/bin/env node

import minimist from "minimist";
import usage from "./usage";

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
    // Just let the process exit normally if the exit code is zero
    if (!forcedError && e === 0) return;

    if (e && e.message) console.error(e.message);

    if (forcedError) processExit(1);
    else setImmediate(function() {
      if (typeof e === "number") {
        return processExit(e);
      }
      processExit(e ? (typeof e.code === "number" ? e.code : 1) : 0);
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
    return require("./commands/version").default({}, [], exit);
  }

  // launch repl by default
  if (args._.length === 0) args._.push("node");

  const subcommand = args._[0];

  let subcommandFn;
  try {
    subcommandFn = require("./commands/" + subcommand).default;
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
