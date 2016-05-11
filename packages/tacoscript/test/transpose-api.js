require('source-map-support').install();

var sourceMap = require("source-map");
var assert = require("chai").assert;

var api = require("../lib/transpose/api").default;

suite("api", function () {
  test("transform", function () {
    assert.equal(api.transform("foo = function() {};").code, "foo = () ->\n");
  });

  test("transformFile", function (done) {
    api.transformFile(__dirname + "/fixtures/transpose-api/file.js", {}, function (err, res) {
      if (err) return done(err);
      assert.equal(res.code, "foo = () ->\n");
      done();
    });
  });

  test("transformFileSync", function () {
    assert.equal(api.transformFileSync(__dirname + "/fixtures/transpose-api/file.js", {}).code, "foo = () ->\n");
  });
});
