#!/usr/bin/env node

try {require("source-map-support").install();} catch (e) {}

var horchata = require("../lib/index");
var fs = require("fs");

var filename = process.argv[2];
if (!filename) {
  console.error("no filename specified");
  process.exit(0);
}

var file = fs.readFileSync(filename, "utf8");
var options = {};
if (process.argv[3]) try {
  options = JSON.parse(process.argv[3]);
} catch (e) {}
var ast = horchata.parse(file, options);

console.log(JSON.stringify(ast, null, "  "));
