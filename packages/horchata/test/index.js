/*global suite,test*/
require('source-map-support').install();
var horchata = require("../lib/index");
var _ = require("lodash");
var expect = require("chai").expect;
var fs = require("fs");
var specOptions = require("../../../specs/options");
var misMatch = require("../../tacoscript-dev-utils").misMatch;
var mochaFixtures = require("mocha-fixtures-generic");
var render = require("tacoscript-cst-utils").render;

var coreSpecs = mochaFixtures(require("path").resolve(__dirname + "/../../../specs/core"),
  _.assign({}, specOptions.core, {
    optionsPath: "parser-options",
    skip: function(test, testPath) {
      return (
        specOptions.core.skip(test, testPath) ||
        test.indexOf("invalid-") === 0 ||
        test.indexOf("unexpected-") === 0 ||
        test.indexOf("malformed-") === 0 ||
        false);
    },
    fixtures: _.assign({}, specOptions.core.fixtures, {
      "tacoAlt0": {loc: ["alternate0.taco"]},
      "tacoAlt1": {loc: ["alternate1.taco"]},
      "tacoAlt2": {loc: ["alternate2.taco"]},
    })
  })
);

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
});

function removeLocInfo(json) {
  if (Object.prototype.toString.call(json) === '[object Array]') {
    for (var i = 0, len = json.length; i < len; i++) {
      if (json[i] != null) removeLocInfo(json[i]);
    }
  } else {
    delete json.start;
    delete json.end;
    delete json.loc;
    if (json.leadingComments == null) delete json.leadingComments;
    if (json.innerComments == null) delete json.innerComments;
    if (json.trailingComments == null) delete json.trailingComments;
    if (json.type === "BlockStatement" && json.directives != null && json.directives.length === 0) {
      delete json.directives;
    }
    for (var k in json) {
      if (json[k] != null && (typeof json[k]) === 'object') {
        removeLocInfo(json[k]);
        if (k === "extra") {
          delete json.extra.rawValue;
          delete json.extra.parenStart; // it won't match up
          // if (json.type === "ObjectExpression") {
          //
          //   delete json.extra.parenthesized;
          // }
          if (json.type === "UpdateExpression" || json.type === "UnaryExpression") {
            delete json.extra.parenthesizedArgument;
          }
          if (Object.keys(json.extra).length === 0) delete json.extra;
        }
      }
    }
  }
  // TODO: store this modified JSON
  return json;
}

_.forOwn(coreSpecs, function(suites, setName) {
  suites.forEach(function (testSuite) {
    suite("horchata: core/" + setName + "/" + testSuite.title, function () {
      _.each(testSuite.tests, function(task) {
        testTask(task, task.auto);
        if (task.tacoAlt0.code) testTask(task, task.tacoAlt0, " (alternate)");
        if (task.tacoAlt1.code) testTask(task, task.tacoAlt1, " (alternate 2)");
        if (task.tacoAlt2.code) testTask(task, task.tacoAlt2, " (alternate 3)");
      });
      function testTask(task, taco, subtitle) {
        test(task.title + (subtitle || ''), !task.disabled && function () {
          var ast = horchata.parse(taco.code, task.options);
          // if (ast.warnings.length > 0) console.warn("Parsing generated " + file.warnings.length + " warnings");
          var expectedAst;
          try {
            expectedAst = removeLocInfo(JSON.parse(task.json.code));
            if (expectedAst.program != null) delete expectedAst.program.sourceType;
          } catch(e) {
            console.log(task.json.loc);
            console.log(e.stack);
          }
          var mismatchMessage = misMatch(expectedAst, ast);
          if (mismatchMessage) {
            // fs.writeFileSync(task.json.loc.replace(".json", ".fail.json"), JSON.stringify(ast, null, "  "), {encoding: "utf-8"});
            // console.log("code:");
            // console.log(taco.code);
            throw new Error(mismatchMessage);
          }
          expect(render(ast)).to.equal(taco.code, "reconstructed" + " !== " + taco.loc);
        });
      }
    });
  });
});
