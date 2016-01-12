/*global suite,test*/
require('source-map-support').install();
var horchata = require("../lib/index");
var fs = require("fs");
var _ = require("lodash");
var specOptions = require("../../../specs/options");
var misMatch = require("../../tacoscript-dev-utils").misMatch;
var mochaFixtures = require("mocha-fixtures-generic");

var coreSpecs = mochaFixtures(require("path").resolve(__dirname + "/../../../specs/unified"), specOptions["unified-loc"]);

function localDisabled(task) {
  return (
    task.title === "AwaitExpression" ||
    task.title === "BindExpression" ||
    task.title === "Decorator" ||
  false);
}

var _hasWrittenAst = false;
_.forOwn(coreSpecs, function(suites, setName) {
  suites.forEach(function (testSuite) {
    suite("horchata: location tests: unified/" + setName + "/" + testSuite.title, function () {
      _.each(testSuite.tests, function(task) {
        test(task.title, !(task.disabled || localDisabled(task)) && function () {
          var ast = horchata.parse(task.source.code, task.options);
          if (task.ast.code === "") {
            delete ast.tokens;
            if (!_hasWrittenAst) {
              fs.writeFileSync(task.ast.loc, JSON.stringify(ast, null, '  '));
              _hasWrittenAst = true;
            }
            throw new Error("Test has no AST");
          }
          var expectedAst = JSON.parse(task.ast.code);
          var mismatchMessage = misMatch(expectedAst, ast);
          if (mismatchMessage) {
            throw new Error(mismatchMessage);
          }
        });
      });
    });
  });
});
