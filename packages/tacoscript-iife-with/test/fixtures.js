/*global suite,test*/
require('source-map-support').install()

var path = require("path")
var devUtils = require("../../tacoscript-dev-utils")
var horchata = require("horchata")

horchata.registerPluginModule("iife-with", require("../lib/horchata/parser"), require("../lib/horchata/lexer"));

suite("tacoscript-iife-with", function () {
  devUtils.parseFixtureRunner(path.join(__dirname, "fixtures"), horchata)
});
