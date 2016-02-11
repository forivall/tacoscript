
import {Api} from "comal";
import config from "./config";
import * as horchata from "horchata";
import babelGenerate from "babel-generator";

export default new Api({
  config,
  prefix: "tacoscript-compose",
  loader: {
    rcFileName: ".tacorc",
    ignoreFileName: ".tacoignore",
    packageKey: "tacoscript",
    pluginModulePrefix: "tacoscript",
    presetModulePrefix: "tacoscript"
  },
  parser: horchata,
  parserOpts: function(opts) {
    return {
      sourceType:    opts.sourceType,
      filename:      opts.filename,
      features:      {}
    };
  },
  // TODO: allow multiple generators, with a default
  // TODO: generator options
  generator: {
    name: "babel-generator",
    generate: babelGenerate
  },
  generatorOpts: function(opts) {
    return {
      ...opts.generate,
      filename: opts.filename
    };
  }
  // other generators: alpastor, tacotruck, taqueria
});
