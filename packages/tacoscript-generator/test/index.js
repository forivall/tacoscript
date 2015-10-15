/*global suite,test*/
var babylon = require('babylon');
var generate = require('../lib/index').default;
var expect = require("chai").expect

suite("taco-printer", function () {
  test("basic", function () {
    var code = "this;\n";
    var ast = babylon.parse(code);
    var out = generate(ast, {}, code);
    expect(out).to.equal("this");
  })
})
