/* @noflow */

import normalizeAst from "../helpers/normalize-ast";
import File from "../file";
import Transformation from "./index";

import Logger from "../logger";
import fileConfig from "../options/file-config";
import coreConfig from "../options/core-config";
import OptionsLoader from "../options/loader";
import defaults from "lodash/defaults";

// TODO: accept streams and buffers for code.

const fileOptMeta = {
  config: fileConfig
};

export default class Pipeline {
  constructor(meta, context) {
    this.meta = meta;

    meta.config = defaults(meta.config, coreConfig);

    this.context = context;

    this.fileLogger = new Logger();
  }

  // TODO: cache transformers

  createTransform(opts?: Object) {
    return new Transformation(this.meta, opts, this, this.context);
  }

  createFile(code: string, opts?: Object) {
    this.fileLogger.config(opts);
    return new File(new OptionsLoader(fileOptMeta, this.fileLogger, this.context, true).load(opts), code);
  }

  exec(transformer: Transformation, code: string, fileOpts?: Object) {
    return this.execFile(transformer, this.createFile(code, fileOpts));
  }

  execFile(transformer: Transformation, file: File) {
    return transformer.runWrapped(file, function () {
      file.preprocessCode();
      transformer.parse(file);
      return transformer.transform(file);
    });
  }

  execFromAst(transformer: Transformation, ast: Object, code: string, opts?: Object) {
    let file = this.createFile(code, opts);
    ast = normalizeAst(ast);

    return transformer.runWrapped(file, function () {
      file.preprocessCode();
      transformer.setAst(file, ast);
      return transformer.transform(file);
    });
  }

  transform(code: string, opts?: Object = {}) {
    let file = this.createFile(code, opts);
    return this.transformFile(file, opts);
  }

  transformFile(file: File, opts?: Object) {
    let transformer = this.createTransform(opts);

    return this.execFile(transformer, file);
  }

  transformFromAst(ast, code: string, opts: Object = {}) {
    let transformer = this.createTransform(opts);
    return this.execFromAst(transformer, ast, code, opts);
  }
}
