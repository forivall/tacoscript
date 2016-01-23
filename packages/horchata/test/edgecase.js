/*global suite,test*/
require('source-map-support').install()

var fs = require("fs")
var path = require("path")

var _ = require("lodash")
var chai = require("chai")
var devUtils = require("../../tacoscript-dev-utils")
chai.use(devUtils.chaiHelper)
var expect = chai.expect
var render = require("tacoscript-cst-utils").render
var saveAst = devUtils.saveAst

var horchata = require("../lib/index")

// TODO: rewrite mocha-fixtures-generic to be more generic, w.r.t directory structure

var fixtureRootDir = path.join(__dirname, "fixtures/edgecase")
var fixtureDirs = fs.readdirSync(fixtureRootDir)

suite("horchata", function () {
  suite("edgecase", function () {
    _.forEach(fixtureDirs, function(fixtureDir) {
      test(fixtureDir, function () {
        var fixtureAstPath = path.join(fixtureRootDir, fixtureDir, "ast.json")
        var fixtureAst; try { fixtureAst = require(fixtureAstPath) } catch(e) {}

        var source = fs.readFileSync(path.join(fixtureRootDir, fixtureDir, "source.taco"), "utf-8")
        var ast = horchata.parse(source)
        if (fixtureAst) {
          expect(ast).matches(fixtureAst)
        } else {
          saveAst(fixtureAstPath, ast)
        }
      })
    })
  })
})
