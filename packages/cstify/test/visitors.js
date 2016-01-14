/*global suite,test*/
var babylon = require("babylon");
var cstify = require("../lib/index").default;

var expect = require("chai").expect;

suite("cstify: new-no-parens", function () {
  test("new without parens should be indicated", function () {
    const code = "new A";
    var ast = cstify(babylon.parse(code), code, {visitors: ['new-no-parens']});
    expect(ast.program.body[0].expression.extra.noParens).to.be.true;
  });
  test("new without parens should be indicated (prop)", function () {
    const code = "new b.A";
    var ast = cstify(babylon.parse(code), code, {visitors: ['new-no-parens']});
    expect(ast.program.body[0].expression.extra.noParens).to.be.true;
  });
  test("new without parens should be indicated ([])", function () {
    const code = 'new b["A"]';
    var ast = cstify(babylon.parse(code), code, {visitors: ['new-no-parens']});
    expect(ast.program.body[0].expression.extra.noParens).to.be.true;
  });

  test("new with parens should not be indicated", function () {
    const code = "new A()";
    var ast = cstify(babylon.parse(code), code, {visitors: ['new-no-parens']});
    var extra = ast.program.body[0].expression.extra || {};
    expect(extra.noParens).to.not.be.ok;
  });
  test("new with parens should not be indicated (prop)", function () {
    const code = "new b.A()";
    var ast = cstify(babylon.parse(code), code, {visitors: ['new-no-parens']});
    var extra = ast.program.body[0].expression.extra || {};
    expect(extra.noParens).to.not.be.ok;
  });
  test("new with parens should not be indicated ([])", function () {
    const code = 'new b["A"]()';
    var ast = cstify(babylon.parse(code), code, {visitors: ['new-no-parens']});
    var extra = ast.program.body[0].expression.extra || {};
    expect(extra.noParens).to.not.be.ok;
  });

});
