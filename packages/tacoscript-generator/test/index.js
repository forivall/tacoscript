/*global suite,test*/
require('source-map-support').install();
var babylon = require('babylon');
var generate = require('../lib/index').default;
var expect = require("chai").expect

suite("taco-printer", function () {
  test("basic", function () {
    var code = "this;\n";
    var ast = babylon.parse(code);
    var out = generate(ast, {}, code);
    expect(out.code).to.equal("this\n");
  });
  test("basic - source maps on", function () {
    var code = "this;\n";
    var ast = babylon.parse(code);
    var out = generate(ast, {sourceMaps: true, sourceFileName: "expected.js"}, code);
    // console.log(out.map.mappings);
    // console.log(out.tokens.length);
    expect(out.code).to.equal("this\n");
  });
})
