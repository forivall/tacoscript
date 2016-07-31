#!/usr/bin/env node

try {require("source-map-support").install();} catch (e) {}

var horchata = require("horchata");
var alpastor = require("../lib/index");
var fs = require("fs");

var filename = process.argv[2];
if (!filename) {
  console.error("no filename specified");
  process.exit(0);
}
var flag = process.argv[3];

var file = fs.readFileSync(filename, "utf8");
var options = {};
// if (process.argv[3]) try {
//   options = JSON.parse(process.argv[3]);
// } catch (e) {}

var ast = horchata.parse(
  file,
  Object.assign({sourceElementsKey: 'tacoscriptSourceElements'}, options)
);
var results = alpastor.generate(
  ast,
  options
);

if (flag === '--ast') {
  console.log(JSON.stringify(ast, null, "  "));
} else {
  console.log(results.code);
}
