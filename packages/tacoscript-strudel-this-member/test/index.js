require('source-map-support').install();

var sourceMap = require("source-map");
var assert = require("chai").assert;

var compose = require("tacoscript").compose;

suite("api", function () {
  test("transform", function () {
    assert.equal(compose.transform("@foo\n", {plugins: [require("../lib")]}).code, "this.foo;");
  });

});
