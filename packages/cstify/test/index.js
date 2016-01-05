/*global suite,test*/
require('source-map-support').install();
var cstify = require("../lib/index").default;
var babylon = require("babylon");
var _ = require("lodash");
var expect = require("chai").expect;
var fs = require("fs");
var specOptions = require("../../../specs/options");
var misMatch = require("../../tacoscript-dev-utils").misMatch;
var mochaFixtures = require("mocha-fixtures-generic");
var render = require("tacoscript-cst-utils").render;

var coreSpecs = mochaFixtures(require("path").resolve(__dirname + "/../../../specs/core"),
  _.assign({}, specOptions.core, {
    optionsPath: "options",
    skip: function(test, testPath) {
      return (
        specOptions.core.skip(test, testPath) ||
        test.indexOf("invalid-") === 0 ||
        test.indexOf("unexpected-") === 0 ||
        test.indexOf("malformed-") === 0 ||
        // TODO: fix these tests
        testPath.indexOf("core/base-literals/string") !== -1 ||
        testPath.indexOf("core/base-expression/function-call") !== -1 && test === "new-no-parens" ||
        testPath.indexOf("core/es2015/uncategorised") !== -1 && (test === "1" || test === "2" || test === "23") ||
        testPath.indexOf("core/es2015/yield") !== -1 && test === "yield-generator-arrow-concise-body" ||
        false);
    }
  })
);

suite("cstify", function () {
  test("basic", function () {
    var code = "this;\n";
    var ast = cstify(babylon.parse(code), code);
    var mismatchMessage = misMatch({
      type: "File",
      sourceElements: [{reference: "program"}],
      program: {
        type: "Program",
        sourceElements: [{reference: "body#next"}, {element: "LineTerminator", value: "\n"}, {element: "EOF"}],
        body: [
          {
            type: "ExpressionStatement",
            sourceElements: [{reference: "expression"}, {element: "Punctuator", value: ";"}],
            expression: {
              type: "ThisExpression",
              sourceElements: [{element: "Keyword", value: "this"}]
            }
          }
        ]
      }
    }, ast);
    if (mismatchMessage) throw new Error(mismatchMessage);
  });
});

_.forOwn(coreSpecs, function(suites, setName) {
  suites.forEach(function (testSuite) {
    suite("cstify: core/" + setName + "/" + testSuite.title, function () {
      _.each(testSuite.tests, function(task) {
        test(task.title, !task.disabled && function () {
          var ast = cstify(babylon.parse(task.js.code, task.options), task.js.code);
          // if (ast.warnings.length > 0) console.warn("Parsing generated " + file.warnings.length + " warnings");
          var expectedAst;
          try {
            expectedAst = JSON.parse(task.json.code);
            if (expectedAst.program != null) delete expectedAst.program.sourceType;
          } catch(e) {
            console.log(task.json.loc);
            console.log(e.stack);
          }
          var mismatchMessage = misMatch(expectedAst, ast);
          if (mismatchMessage) throw new Error(mismatchMessage);
          // console.log(JSON.stringify(ast, null, ' '))
          expect(render(ast)).to.equal(task.js.code, "reconstructed" + " !== " + task.js.loc);
        });
      });
    });
  });
});
