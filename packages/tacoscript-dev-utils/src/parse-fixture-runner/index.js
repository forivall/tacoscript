/*global suite,test*/
var path = require("path")

var _ = require("lodash")
var chai = require("chai")
var devUtils = require("../../index")
chai.use(devUtils.chaiHelper)
var expect = chai.expect
// var render = require("tacoscript-cst-utils").render
var saveAst = devUtils.saveAst
var mochaFixtures = require("mocha-fixtures-generic")

export default function (fixturePath, parser) {
  var fixtures = mochaFixtures.get(fixturePath, {
    fixtures: {
      "source": { loc: ["source.taco"] }
    },
    data: {
      "ast": "ast.json",
      "err": "error.json"
    }
  });

  function isDisabled(task) { return task.disabled || task.source.code === null; }

  devUtils.eachSuite(fixtures, function(testSuite) {
    _.forEach(testSuite.tests, function(task) {
      test(task.title, !isDisabled(task) && function () {
        if (task.err) {
          expect(parser.parse.bind(parser, task.source.code, testSuite.options)).to.throw(task.err.message)
        } else {
          var ast = parser.parse(task.source.code, testSuite.options)
          if (task.ast) {
            expect(ast).matches(task.ast)
            // expect(render(ast)).to.equal(source)
          } else {
            saveAst(path.join(task.filename, "ast.json"), ast)
          }
        }
      })
    })
  })
}
