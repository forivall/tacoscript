var transform = require("./_babel_api").transform;
// var transform = require("../lib/index").transform;
var Plugin    = require("../lib/transformation/plugin").default;
var chai      = require("chai");

suite("traversal path", function () {
  test("replaceWithSourceString", function () {
    var expectCode = "function foo() {}";

    var actualCode = transform(expectCode, {
      plugins: [new Plugin({
        visitor: {
          FunctionDeclaration: function (path) {
            path.replaceWithSourceString("console.whatever()");
          }
        }
      })]
    }).code;

    chai.expect(actualCode).to.be.equal("console.whatever();");
  });
});
