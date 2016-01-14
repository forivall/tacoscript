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
        // TODO: fix this test: need to analyse cst for data
        testPath.indexOf("core/base-expression/function-call") !== -1 && test === "new-no-parens" ||
        // TODO: fix these tests -- they have issues with babylon, not cstify
        testPath.indexOf("core/base-literals/string") !== -1 ||
        testPath.indexOf("core/es2015/uncategorised") !== -1 && (test === "1" || test === "2" || test === "23") ||
        testPath.indexOf("core/es2015/yield") !== -1 && test === "yield-generator-arrow-concise-body" ||
        false);
    }
  })
);
var unifiedSpecs = mochaFixtures(require("path").resolve(__dirname + "/../../../specs/unified"),
  _.extend({}, specOptions.unified, {
    optionsPath: "options",
    fixtures: _.assign({}, specOptions.unified.fixtures, {
      // "json": { loc: ["expected.json", "expected.cst.json"] }
    })
  })
);
var babylonParseOpts = {
  strictMode: false,
  // 6.0
  plugins: [
    "asyncFunctions",
    "classProperties",
    "decorators",
    "exponentiationOperator",
    "exportExtensions",
    "functionBind",
  ],
};

function removeComments(json, context) {
  if (Object.prototype.toString.call(json) === '[object Array]') {
    // for (var i = 0, len = json.length; i < len; i++) {
    // walk backwards so that duplicate trailingComments are removed
    for (var i = json.length - 1; i >= 0; i--) {
      if (json[i] != null) removeComments(json[i], context);
    }
  } else {
    delete json.leadingComments;
    delete json.innerComments;
    delete json.trailingComments;
    for (var k in json) {
      if (json[k] != null && (typeof json[k]) === 'object') {
        removeComments(json[k], context);
      }
    }
  }
  // TODO: store this modified JSON
  return json;
}
suite("cstify: sourceElements", function () {
  test("basic", function () {
    var code = "this ;\n";
    var ast = cstify(babylon.parse(code, babylonParseOpts), code);
    var mismatchMessage = misMatch({
      type: "File",
      sourceElements: [{reference: "program"}],
      program: {
        type: "Program",
        sourceElements: [
          {reference: "body#next"},
          {element: "LineTerminator", value: "\n"},
          {element: "EOF"}
        ],
        body: [
          {
            type: "ExpressionStatement",
            sourceElements: [
              {reference: "expression"},
              {element: "WhiteSpace", value: " ", start: 4, end: 5},
              {element: "Punctuator", value: ";"}],
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

  test("arrayHole", function () {
    var code = "[,,];\n";
    var ast = cstify(babylon.parse(code, babylonParseOpts), code);
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
              type: "ArrayExpression",
              sourceElements: [
                {element: "Punctuator", value: "["},
                {element: "ArrayHole", reference: "elements#next"},
                {element: "Punctuator", value: ","},
                {element: "ArrayHole", reference: "elements#next"},
                {element: "Punctuator", value: ","},
                {element: "Punctuator", value: "]"},
              ],
              elements: [null, null]
            }
          }
        ]
      }
    }, ast);
    if (mismatchMessage) throw new Error(mismatchMessage);
  });
  test("templates", function () {
    var code = "`a${b}c${d}e`;\n";
    var ast = cstify(babylon.parse(code, babylonParseOpts), code);
    var mismatchMessage = misMatch({
      type: "File",
      program: {
        type: "Program",
        body: [
          {
            type: "ExpressionStatement",
            sourceElements: [{reference: "expression"}, {element: "Punctuator", value: ";"}],
            expression: {
              type: "TemplateLiteral",
              sourceElements: [
                {element: "Punctuator", value: "`"},
                {reference: "quasis#next"},
                {element: "Punctuator", value: "${"},
                {reference: "expressions#next"},
                {element: "Punctuator", value: "}"},
                {reference: "quasis#next"},
                {element: "Punctuator", value: "${"},
                {reference: "expressions#next"},
                {element: "Punctuator", value: "}"},
                {reference: "quasis#next"},
                {element: "Punctuator", value: "`"},
              ],
            }
          }
        ]
      }
    }, ast);
    // console.log(ast.program.body[0].expression.sourceElements)
    if (mismatchMessage) throw new Error(mismatchMessage);
  });
});

_.forOwn(coreSpecs, function(suites, setName) {
  suites.forEach(function (testSuite) {
    suite("cstify: sourceElements: core/" + setName + "/" + testSuite.title, function () {
      _.each(testSuite.tests, function(task) {
        test(task.title, !task.disabled && function () {
          var ast = cstify(babylon.parse(task.js.code, _.assign({}, babylonParseOpts, task.options)), task.js.code);
          // if (ast.warnings.length > 0) console.warn("Parsing generated " + file.warnings.length + " warnings");
          var expectedAst;
          try {
            expectedAst = removeComments(JSON.parse(task.json.code));
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

_.forOwn(unifiedSpecs, function(suites, setName) {
  suites.forEach(function (testSuite) {
    suite("cstify: sourceElements: unified/" + setName + "/" + testSuite.title, function () {
      _.each(testSuite.tests, function(task) {
        test(task.title, !(task.disabled || task.title === "Decorator") && function () {
          var ast = cstify(babylon.parse(task.js.code, _.assign({}, babylonParseOpts, task.options)), task.js.code);
          // console.log(JSON.stringify(ast, null, ' '))
          expect(render(ast)).to.equal(task.js.code, "reconstructed" + " !== " + task.js.loc);
        });
      });
    });
  });
});
