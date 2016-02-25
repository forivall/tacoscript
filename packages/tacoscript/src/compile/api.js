
import {Api, babelGeneratorOptions/*, babylonOptions*/} from "comal";

import babelGenerate from "babel-generator";
import babelGeneratorPkg from "babel-generator/package.json";

// import * as babylon from "babylon";

import pick from "lodash/pick";

module.exports = new Api({
  config: {/*...babylonOptions, */...babelGeneratorOptions},
  prefix: "babel",
  loader: {
    rcFileName: ".babelrc",
    ignoreFileName: ".babelignore",
    packageKey: "babel"
  },
  // parser should not be used; should only accept ASTs
  // TODO: add tests in comal to not expose code-accepting api methods
  // parser: {
  //   ...babylon,
  //   name: "babylon"
  // },
  parserOpts: function(opts) {
    return {
      highlightCode: opts.highlightCode,
      nonStandard:   opts.nonStandard,
      sourceType:    opts.sourceType,
      filename:      opts.filename,
      plugins:       [],
    };
  },
  generator: {
    name: "babel-generator",
    version: babelGeneratorPkg.version,
    generate: babelGenerate,
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
