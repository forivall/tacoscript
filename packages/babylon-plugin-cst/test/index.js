/*global suite,test*/
var babylon = require("babylon");
require("../install");
var tokenTypes = require("../lib/types").tokenTypes;

var expect = require("chai").expect;

suite("babylon-plugin-cst", function () {
  test("tokens should have whitespace", function () {
    var ast = babylon.parse("new A", {plugins: {cst: true}});
    expect(ast.tokens[1].type).to.equal(tokenTypes.whitespace);
  });

  test("new without parens should be indicated", function () {
    var ast = babylon.parse("new A", {plugins: {cst: true}});
    expect(ast.program.body[0].expression.emptyArguments).to.be.true;
  });
  test("new without parens should be indicated (prop)", function () {
    var ast = babylon.parse("new b.A", {plugins: {cst: true}});
    expect(ast.program.body[0].expression.emptyArguments).to.be.true;
  });
  test("new without parens should be indicated ([])", function () {
    var ast = babylon.parse('new b["A"]', {plugins: {cst: true}});
    expect(ast.program.body[0].expression.emptyArguments).to.be.true;
  });

  test("new with parens should not be indicated", function () {
    var ast = babylon.parse("new A()", {plugins: {cst: true}});
    expect(ast.program.body[0].expression.emptyArguments).to.not.be.ok;
  });
  test("new with parens should not be indicated (prop)", function () {
    var ast = babylon.parse("new b.A()", {plugins: {cst: true}});
    expect(ast.program.body[0].expression.emptyArguments).to.not.be.ok;
  });
  test("new with parens should not be indicated ([])", function () {
    var ast = babylon.parse('new b["A"]()', {plugins: {cst: true}});
    expect(ast.program.body[0].expression.emptyArguments).to.not.be.ok;
  });

  test("doesn't break new.target", function () {
    var ast = babylon.parse('new.target', {plugins: {cst: true}});
    expect(ast.program.body[0].expression.meta.name).to.equal('new');
  });
});
