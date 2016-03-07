/*global suite,test*/
require('source-map-support').install();

var sourceMap = require("source-map");
var assert = require("chai").assert;

var api = require("tacoscript");

suite("logical-assign", function () {
  test("compose", function () {
    assert.equal(api.compose.transform("(a or= b)\n", {plugins: [require("../lib")]}).code, "(a || (a = b));");
    assert.equal(api.compose.transform("a or= b\n", {plugins: [require("../lib")]}).code, "if (!a) a = b;");
  });

  test("transpose", function () {
    assert.equal(api.transpose.transform("(a || (a = b));", {plugins: [require("../lib")]}).code, "(a or= b)\n");
    assert.equal(api.transpose.transform("if (!a) a = b;", {plugins: [require("../lib")]}).code, "a or= b\n");
  });

  test("compose-e2e")
  test("transpose-e2e")

});
