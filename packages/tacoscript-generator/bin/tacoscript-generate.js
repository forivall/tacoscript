#!/usr/bin/env node
try { require('source-map-support').install(); } catch (e) {}
var generate = require("../lib/index").default;
var fs = require("fs");

var filename = process.argv[2];
if (!filename) {
  console.error("no filename specified");
  process.exit(0);
}

// TODO: add options for preserve, etc.

var file = fs.readFileSync(filename, "utf8");
var ast = JSON.parse(file);
var generated = generate(ast, {format: {preserve: false}});

process.stdout.write(generated.code);
