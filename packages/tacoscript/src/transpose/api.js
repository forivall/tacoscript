
import {Api} from "comal";
import config from "./config";
import * as babylon from "babylon";
import * as babylonpkg from "babylon/package.json";
import * as tacotruck from "tacotruck";

export default new Api({
  config,
  prefix: "tacoscript-transpose",
  loader: {
    pluginProp: "transpose",
    generatorPluginProp: "tacotruck", // TODO: should be moved to read the generator's name
    rcFileName: ".tacorc",
    ignoreFileName: ".tacoignore",
    packageKey: "tacoscript",
    pluginModulePrefix: "tacoscript",
    presetModulePrefix: "tacoscript"
  },
  parser: {
    name: babylonpkg.name,
    version: babylonpkg.version,
    parse: babylon.parse
  },
  parserOpts: function(opts) {
    return {
      sourceType:    opts.sourceType,
      filename:      opts.filename,
      features:      {}
    };
  },
  // TODO: allow multiple generators, with a default
  generator: tacotruck,
  generatorOpts: function(opts) {
    return {
      ...opts.generate,
      filename: opts.filename,
      plugins: opts.generatorPlugins
    };
  }
  // other generators: alpastor, tacotruck, taqueria
});
