var assert = require("assert");
var async = require("async");

var comal = require("../lib/index");
var api = new comal.Api({
  parser: require("babylon"),
  generator: { generate: require("babel-generator").default }
});

var fs = require("fs");
var path = require("path");

// Test that plugins & presets are resolved relative to `filename`.
suite("addon resolution", function () {
  test("addon resolution", function (done) {
    var fixtures = {};
    var paths = {};

    paths.fixtures = path.join(
      __dirname,
      "fixtures",
      "resolution",
      "resolve-addons-relative-to-file"
    );

    async.each(
      ["actual", "expected"],
      function (key, mapDone) {
        paths[key] = path.join(paths.fixtures, key + ".js");
        fs.readFile(paths[key], { encoding: "utf8" }, function (err, data) {
          if (err) return mapDone(err);
          fixtures[key] = data.trim();
          mapDone();
        });
      },
      fixturesReady
    );

    function fixturesReady (err) {
      if (err) return done(err);

      var actual = api.transform(fixtures.actual, {
        filename: paths.actual,
        plugins: ["addons/plugin"],
        presets: ["addons/preset"],
      }).code;

      assert.equal(actual, fixtures.expected);
      done();
    }
    // fixturesReady
  });
});
