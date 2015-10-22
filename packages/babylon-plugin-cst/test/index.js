/*global suite,test*/
var babylon = require("babylon");
require("../install");

var expect = require("chai").expect;

suite("babylon-plugin-cst", function () {
  test("tokens should have whitespace", function () {
    var ast = babylon.parse("new A", {plugins: {cst: true}});
    expect(ast.tokens[1].type).to.equal("Whitespace");
  })
})
