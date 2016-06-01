/*global suite,test*/
require('source-map-support').install();
var _ = require("lodash");
var expect = require("chai").expect;
var specOptions = require("../../../specs/options");
var mochaFixtures = require("mocha-fixtures-generic");

var horchata = require("../../horchata");
var alpastor = require("../lib/index");

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
    }
  })
);

_.forOwn(coreSpecs, function(suites, setName) {
  suites.forEach(function (testSuite) {
    suite("horchata: core/" + setName + "/" + testSuite.title, function () {
      _.each(testSuite.tests, function(task) {
        testTask(task, task.alpastortmp, task.auto);
      });
      function testTask(task, js, taco) {
        test(task.title, !task.disabled && function () {
          var ast = horchata.parse(
            taco.code,
            Object.assign({sourceElementsKey: 'tacoscriptSourceElements'}, task.options)
          );
          var result;
          try {
            result = alpastor.generate(ast);
          } catch(e) {
            console.error('generation errored out ' + task.json.loc + ':\n' + e.stack);
            expect.fail();
          }
          expect(result.code).equals(taco.code);
        });
      }
    });
  });
});
