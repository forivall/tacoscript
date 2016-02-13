#!/usr/bin/env node

import minimist from "minimist";
import usage from "./_usage";

import omit from "lodash/omit";

const args = minimist(process.argv.slice(2), {
  boolean: ["version", "versions", "verbose"],
  alias: {
    "help": "h",
    "version": "V",
    "versions": "VV",
    "verbose": "v"
  },
  // The first non-option argument is the subcommand:
  stopEarly: true
});

const exit = function(e) {
  setImmediate(function() {
    process.exit(e ? e.code || 1 : 0);
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
  console.warn("Unknown command\n");
  return usage(false, exit);
}

return subcommandFn(args._.slice(1), omit(args, "_"), exit);
