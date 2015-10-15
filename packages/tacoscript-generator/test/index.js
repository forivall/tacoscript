/*global suite,test*/
require('source-map-support').install();
var _ = require("lodash");
var babylon = require('babylon');
var generate = require('../lib/index').default;
var expect = require("chai").expect;
var mochaFixtures = require("mocha-fixtures-generic");

var suiteSets = mochaFixtures(require("path").resolve(__dirname + "/../../../specs/core/basic"), {
  optionsPath: "options",
  fixtures: {
    "js": { loc: ["actual.js"] },
    "taco": { loc: ["actual.taco"] },
    "json": { loc: ["expected.json"] },
    "raw": { loc: ["actual.json"] }
  },
  getTaskOptions: function(suite, test) {
    return _.merge({
      sourceFileName: test.js.filename,
    }, _.cloneDeep(suite.options));
  },
});

suite("taco-printer", function () {
  test("basic", function () {
    var code = "this;\n";
    var ast = babylon.parse(code);
    var out = generate(ast, {}, code);
    expect(out.code).to.equal("this\n");
  });
  test("basic - source maps on", function () {
    var code = "this;\n";
    var ast = babylon.parse(code);
    var out = generate(ast, {sourceMaps: true, sourceFileName: "expected.js"}, code);
    // console.log(out.map.mappings);
    // console.log(out.tokens.length);
    expect(out.code).to.equal("this\n");
  });
});
_.forOwn(suiteSets, function(suites, setName) {
  suites.forEach(function (testSuite) {
    suite("generation/" + setName + "/basic/" + testSuite.title, function () {
      _.each(testSuite.tests, function (task) {
        test(task.title, !task.disabled && function () {
          var taco = task.taco;
          var js = task.js;

          var actualAst = babylon.parse(js.code, {
            filename: js.loc,
            // plugins: [
            //   "jsx",
            //   "flow",
            //   "decorators",
            //   "asyncFunctions",
            //   "exportExtensions",
            //   "functionBind",
            // ],
            strictMode: false,
            sourceType: "module",
          });

          var actualCode = generate(actualAst, task.options, js.code).code;
          expect(actualCode).to.equal(taco.code, js.loc + " !== " + taco.loc);
        });
      });
    });
  });
});
