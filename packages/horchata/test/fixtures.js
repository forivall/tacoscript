/*global suite,test*/
require('source-map-support').install()

var path = require("path")
var devUtils = require("../../tacoscript-dev-utils")

var horchata = require("../lib/index")

suite("horchata", function () {
  devUtils.parseFixtureRunner(path.join(__dirname, "fixtures"), horchata);
})
