require('source-map-support').install();

var sourceMap = require("source-map");
var assert = require("chai").assert;

var api = require("tacoscript");

suite("strudel-this-member", function () {
  test("compose", function () {
    assert.equal(api.compose.transform("@foo\n", {plugins: [require("../lib")]}).code, "this.foo;");
  });

  test("transpose", function () {
    assert.equal(api.transpose.transform("this.foo;", {plugins: [require("../lib")]}).code, "@foo\n");
  });

});
