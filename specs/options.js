var _ = require("lodash");

var baseOptions = module.exports.base = {
  optionsPath: "options",
  skip: function(test, testPath) {
    return test === "README.md" || test.indexOf("options.json") !== -1;
  },
  fixtures: {
    // actual should preserve whitespace
    "js": { loc: ["actual.js"] },
    "taco": { loc: ["actual.taco"] },
    // expected should use autoformatting rules
    "auto": { loc: ["expected.taco"] },
    "babel": { loc: ["expected.js"] },
    // estree ast
    "json": { loc: ["expected.json"] },
    // pre-transform tacoscript ast
    "raw": { loc: ["actual.json"] },
  },
  getTaskOptions: function(suite, test) {
    return _.merge({
      sourceFileName: test.js.filename,
    }, _.cloneDeep(suite.options));
  },
};

module.exports.core = {
  optionsPath: baseOptions.optionsPath,
  skip: function(test, testPath) {
    return (
      baseOptions.skip(test, testPath) ||
      testPath.indexOf("/jsx/") !== -1 ||
      testPath.indexOf("/static-typing/") !== -1 ||
      false
    );
  },
  disabled: function(testName, testPath) {
    return (
      testName[0] === "." ||
      testPath.indexOf("/comments/edgecase/") !== -1 ||
      testPath.indexOf("/invalid/") !== -1 ||
      testPath.indexOf("/todo/") !== -1 ||
      testPath.indexOf("/esnext/") !== -1 ||
      testPath.indexOf("/experimental/") !== -1 ||
      false
    );
  },
  fixtures: baseOptions.fixtures,
  getTaskOptions: baseOptions.getTaskOptions,
}
var unifiedOptions = module.exports.unified = {
  optionsPath: baseOptions.optionsPath,
  skip: function(test, testPath) {
    return (
      baseOptions.skip(test, testPath) ||
      test.indexOf("TODO") === 0 || // TODO: implement comprehensions
      testPath.indexOf("/esnext/") !== -1 || // TODO: implement comprehensions
      testPath.indexOf("/plugins/jsx/") !== -1 ||
      testPath.indexOf("/plugins/static-typing/") !== -1 ||
      testPath.indexOf("/todo/") !== -1 ||
      testPath.indexOf("/comments/") !== -1 ||
      false
    );
  },
  fixtures: baseOptions.fixtures,
  getTaskOptions: baseOptions.getTaskOptions,
};
module.exports['unified-loc'] = {
  optionsPath: unifiedOptions.optionsPath,
  skip: function(test, testPath) {
    return (
      unifiedOptions.skip(test, testPath) ||
      testPath.indexOf("/base/edgecase/") !== -1 ||
      testPath.indexOf("/base/parentheses/") !== -1 ||
      false
    );
  },
  fixtures: {
    "source": { loc: ["actual.taco"] },
    "ast": { loc: ["actual.taco.ast.json"] },
  },
  getTaskOptions: function(suite) {
    return _.cloneDeep(suite.options);
  },
};
