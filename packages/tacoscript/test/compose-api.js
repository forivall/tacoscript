require('source-map-support').install();

var sourceMap = require("source-map");
var assert = require("chai").assert;

var api = require("../lib/compose/api");

suite("api", function () {
  test("transform", function () {
    assert.equal(api.transform("foo = () ->\n").code, "foo = function () {};");
  });

  test("transformFile", function (done) {
    api.transformFile(__dirname + "/fixtures/compose-api/file.taco", {}, function (err, res) {
      if (err) return done(err);
      assert.equal(res.code, "foo = function () {};");
      done();
    });
  });

  test("transformFileSync", function () {
    assert.equal(api.transformFileSync(__dirname + "/fixtures/compose-api/file.taco", {}).code, "foo = function () {};");
  });
});
