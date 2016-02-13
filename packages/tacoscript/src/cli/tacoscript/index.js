#!/usr/bin/env node

import minimist from "minimist";
import usage from "./_usage";

const argv = minimist(process.argv.slice(2), {
  boolean: ["version", "versions"],
  alias: {
    "help": "h",
    "version": "V",
    "versions": "VV"
  },
  default: {
    "help": false,
    "version": false,
    "versions": false
  },
  // The first non-option argument is the subcommand:
  stopEarly: true
});

if (argv._[0] === "help" || argv.help) {
  let whichHelp = argv.help ? argv.help : argv._[1];
  if (whichHelp === true) whichHelp = false;
  return usage(whichHelp);
}

if (argv.version) {
  console.log(require("../../package.json").version);
  return;
}

const exit = function(e) {
  setImmediate(function() {
    process.exit(e ? e.code || 1 : 0);
  });
}

if (argv.versions) {
  return require("./versions")([], exit);
}

if (argv._.length === 0) argv._.push("node-repl");

const subcommand = argv._[0];

if (subcommand === "index" || subcommand[0] === "_") {
  console.warn("Unknown command\n");
  return usage();
}

let subcommandFn;
try {
  subcommandFn = require("./" + subcommand);
  if (subcommandFn.__esModule) subcommandFn = subcommandFn.default;
} catch (e) {
  console.warn("Unknown command\n");
  return usage();
}

return subcommandFn(argv._, exit);
