#!/usr/bin/env node
/* eslint no-var: 0 */

var babylon = require("babylon");
var cstify  = require("..").default;
var fs      = require("fs");

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
var ast  = cstify(babylon.parse(file, options), file);

console.log(JSON.stringify(ast, null, "  "));
