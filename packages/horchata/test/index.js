/*global suite,test*/
require('source-map-support').install();
var horchata = require("../lib/index");
var _ = require("lodash");
var expect = require("chai").expect;
var misMatch = require("../../tacoscript-dev-utils").misMatch;
var render = require("tacoscript-cst-utils").render;

suite("horchata", function () {
  test("basic", function () {
    var code = "this\n";
    var ast = horchata.parse(code);
    var mismatchMessage = misMatch({
      type: "File",
      program: {
        type: "Program",
        body: [
          {
            type: "ExpressionStatement",
            expression: {
              type: "ThisExpression"
            }
          }
        ]
      }
    }, ast);

    if (mismatchMessage) throw new Error(mismatchMessage);
  });

  test("altSourceElements", function () {
    var code = "this\n";
    var ast = horchata.parse(code, {sourceElementsKey: 'sourceElementsTaco'});
    expect(ast).contains.keys('sourceElementsTaco');
    expect(render(ast, 'sourceElementsTaco')).to.equal(code);
  });
});
