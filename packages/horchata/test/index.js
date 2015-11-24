/*global suite,test*/
require('source-map-support').install();
var horchata = require("../lib/index");
var _ = require("lodash");
var fs = require("fs");
var specOptions = require("../../../specs/options");
var misMatch = require("../../tacoscript-dev-utils").misMatch;
var mochaFixtures = require("mocha-fixtures-generic");

var coreSpecs = mochaFixtures(require("path").resolve(__dirname + "/../../../specs/core"),
  _.assign({}, specOptions.core, {
    optionsPath: "parser-options",
    skip: function(test, testPath) {
      return (
        specOptions.core.skip(test, testPath) ||
        testPath.indexOf("base-edgecase") !== -1 ||
        test.indexOf("invalid-") === 0 ||
        test.indexOf("unexpected-") === 0 ||
        test.indexOf("malformed-") === 0 ||
        false);
    }
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
    for (var k in json) {
      if (json[k] != null && (typeof json[k]) === 'object') {
        removeLocInfo(json[k]);
      }
    }
  }
  return json;
}

_.forOwn(coreSpecs, function(suites, setName) {
  suites.forEach(function (testSuite) {
    suite("horchata: core/" + setName + "/" + testSuite.title, function () {
      _.each(testSuite.tests, function (task) {
        // comment out the following line when generating new specs
        // if (!task.auto.code && !fs.existsSync(task.auto.loc.replace('expected.json/', ''))) { task.disabled = true; }
        test(task.title, !task.disabled && function () {
          // var taco = task.taco;
          var taco = task.auto;

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
            fs.writeFileSync(task.json.loc.replace(".json", ".fail.json"), JSON.stringify(ast, null, "  "), {encoding: "utf-8"});
            console.log("code:");
            console.log(taco.code);
            // console.dir(ast.program, {depth: null});
            throw new Error(mismatchMessage);
          }
        });
      });
    });
  });
});
