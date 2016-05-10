
var assign = require("lodash/assign");
var pick = require("lodash/pick");

var Api = require("../lib/api").default;

module.exports = new Api({
  config: assign({}, require("../lib/options/babylon-config"), require("../lib/options/babel-generator-config")),
  prefix: "babel",
  loader: {
    rcFileName: ".babelrc",
    ignoreFileName: ".babelignore",
    packageKey: "babel"
  },
  parser: assign({
    name: "babylon"
  }, require("babylon")),
  parserOpts: function(opts) {
    return {
      highlightCode: opts.highlightCode,
      nonStandard:   opts.nonStandard,
      sourceType:    opts.sourceType,
      filename:      opts.filename,
      plugins:       []
    };
  },
  generator: {
    name: "babel-generator",
    generate: require("babel-generator").default
  },
  generatorOpts: function(opts) {
    return pick(opts, [
      "filename",
      "sourceMap",
      "sourceMaps",
      "sourceMapTarget",
      "sourceFileName",
      "sourceRoot",
      "retainLines",
      "comments",
      "shouldPrintComment",
      "compact",
      "minified",
      "concise",
      "quotes",
      "auxiliaryCommentBefore",
      "auxiliaryCommentAfter",
    ])
  }
});
