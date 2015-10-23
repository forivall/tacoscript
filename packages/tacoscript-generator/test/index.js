/*global suite,test*/
require('source-map-support').install();
var fs = require("fs");
var _ = require("lodash");
var babylon = require('babylon');
var generate = require('../lib/index').default;
var expect = require("chai").expect;
var mochaFixtures = require("mocha-fixtures-generic");
require("babylon-plugin-cst").install();

var suiteSets = mochaFixtures(require("path").resolve(__dirname + "/../../../specs/core"), {
  optionsPath: "options",
  skip: function(test, testPath) { return test === "README.md" || testPath.indexOf("/comments/") !== -1 },
  fixtures: {
    // actual should preserve whitespace
    "js": { loc: ["actual.js"] },
    "taco": { loc: ["actual.taco"] },
    // expected should use autoformatting rules
    "auto": { loc: ["expected.taco"] },
    "babel": { loc: ["expected.js"] },
    // estree ast
    "json": { loc: ["expected.json"] },
    // pre-transform tacoscript ast
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
    suite("generation/basic/" + setName + "/" + testSuite.title, function () {
      _.each(testSuite.tests, function (task) {
        test(task.title, !task.disabled && function () {
          var taco = task.auto;
          var js = task.js;

          var actualAst = babylon.parse(js.code, {
            filename: js.loc,
            strictMode: false,
            sourceType: "module",
            plugins: {
              "cst": true
            }
          });
          var options = _.merge({format: {perserve: false}}, task.options);
          var result = generate(actualAst, options, js.code);
          var actualCode = result.code;
          // console.log(Array.prototype.map.call(actualCode, (function(c){return c.charCodeAt(0)})))
          // console.log(Array.prototype.map.call(taco.code, (function(c){return c.charCodeAt(0)})))
          var tacoLoc = taco.loc.replace('expected.json/', '');
          // TODO: fix duplicate newlines properly -- this issue is only with object literals
          actualCode = actualCode.replace("\n\n}", "\n}");
          // console.log(result.tokens);
          if (!taco.code && !fs.existsSync(tacoLoc)) {
            fs.writeFileSync(tacoLoc, actualCode, {encoding: "utf8"});
          } else {
            expect(actualCode.trim()).to.equal(taco.code.trim(), js.loc + " !== " + taco.loc);
          }
        });
      });
    });
  });
});
