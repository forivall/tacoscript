/*global suite,test*/
require('source-map-support').install();
var horchata = require("../lib/index");
var _ = require("lodash");
var specOptions = require("../../../specs/options");
var misMatch = require("../../tacoscript-dev-utils").misMatch;
var mochaFixtures = require("mocha-fixtures-generic");

var coreSpecs = mochaFixtures(require("path").resolve(__dirname + "/../../../specs/core"),
  _.assign({}, specOptions.core, {
    skip: function(test, testPath) {
      return specOptions.core.skip(test, testPath) ||
      test.indexOf("invalid-") === 0 ||
      test.indexOf("unexpected-") === 0 ||
      test.indexOf("malformed-") === 0;
    }
  })
);

suite("taco-printer", function () {
  test("basic", function () {
    var code = "this\n";
    var ast = horchata.parse(code);
    console.dir(ast);
  });
});

_.forOwn(coreSpecs, function(suites, setName) {
  suites.forEach(function (testSuite) {
    suite("tacoscript-generator: (preserve=false) core/" + setName + "/" + testSuite.title, function () {
      _.each(testSuite.tests, function (task) {
        // comment out the following line when generating new specs
        // if (!task.auto.code && !fs.existsSync(task.auto.loc.replace('expected.json/', ''))) { task.disabled = true; }
        test(task.title, !task.disabled && function () {
          var taco = task.taco;

          var ast = horchata.parse(taco.code);
          var expectedAst;
          try {
            expectedAst = JSON.parse(task.json.code);
          } catch(e) {}
          var mismatchMessage = misMatch(expectedAst, ast);
          if (mismatchMessage) throw new Error(mismatchMessage);
        });
      });
    });
  });
});
