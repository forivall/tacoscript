#!/usr/bin/env node

try {require("source-map-support").install();} catch (e) {}

var generate = require("../lib/index").default;
var fs = require("fs");

var filename = process.argv[2];
if (!filename) {
  console.error("no filename specified");
  process.exit(0);
}

var file = fs.readFileSync(filename, "utf8");
var options = {format: {preserve: false}};
if (process.argv[3]) try {
  options = JSON.parse(process.argv[3]);
} catch (e) {}
var ast = JSON.parse(file);
var generated = generate(ast, options);

process.stdout.write(generated.code);
