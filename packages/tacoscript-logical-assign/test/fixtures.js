/*global suite,test*/
require('source-map-support').install()

var path = require("path")
var devUtils = require("../../tacoscript-dev-utils")
var horchata = require("horchata")

horchata.registerPluginModule("logical-assign", require("../lib/horchata/parser"), require("../lib/horchata/lexer"));

suite("tacoscript-logical-assign", function () {
  devUtils.parseFixtureRunner(path.join(__dirname, "fixtures"), horchata)
})
