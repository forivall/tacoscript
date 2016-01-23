/*global suite,test*/
require('source-map-support').install();
var horchata = require("../lib/index");
var fs = require("fs");
var _ = require("lodash");
var specOptions = require("../../../specs/options");
var devUtils = require("../../tacoscript-dev-utils");
var misMatch = devUtils.misMatch;
var saveAst = devUtils.saveAst;

var GENERATE = !!(typeof process !== 'undefined' && process.env.GENERATE);

var mochaFixtures = require("mocha-fixtures-generic");
var specs = mochaFixtures(require("path").resolve(__dirname + "/../../../specs/unified"), specOptions["unified-loc"]);
// fs.writeFileSync("locSpecs.json", JSON.stringify(coreSpecs));
// var specs = require("./fixtures/locSpecs.json");

function localDisabled(task, groupName) {
  return (
    groupName === "es2015/basic" && (
      task.title === "AwaitExpression" ||
      task.title === "Decorator" ||
      task.title === "ExportDefaultDeclaration ExportSpecifier ExportNamedDeclaration" ||
    false) ||
    groupName === "es2015/edgecase" && task.title === "exports" ||
  false);
}

_.forOwn(specs, function(suites, setName) {
  suites.forEach(function (testSuite) {
    const groupName = setName + "/" + testSuite.title;
    suite("horchata: location tests: unified/" + groupName, function () {
      _.each(testSuite.tests, function(task) {
        test(task.title, !(task.disabled || localDisabled(task, groupName)) && function () {
          var ast = horchata.parse(task.source.code, task.options);
          if (task.ast.code === "") {
            delete ast.tokens;
            if (GENERATE) fs.writeFileSync(task.ast.loc, JSON.stringify(ast, null, '  '));
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
