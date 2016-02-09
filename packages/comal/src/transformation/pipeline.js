/* @noflow */

import normalizeAst from "../helpers/normalize-ast";
import File from "../file";
import Transformation from "./index";

import Logger from "../logger";
import fileOptMeta from "../options/file-config";
import OptionsLoader from "../options/loader";

// TODO: accept streams and buffers for code.

export default class Pipeline {
  constructor(optMeta, context) {
    this.optionMeta = optMeta;
    this.context = context;

    this.fileLogger = new Logger();
  }

  // TODO: cache transformers

  createTransform(opts?: Object) {
    return new Transformation(this.optionMeta, opts, this);
  }

  createFile(code: string, opts?: Object) {
    this.fileLogger.config(opts);
    return new File(new OptionsLoader(fileOptMeta, this.fileLogger, this.context).load(opts), code);
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

  transform(code: string, opts?: Object) {
    let file = this.createFile(code, opts);
    return this.transformFile(file, opts);
  }

  transformFile(file: File, opts?: Object) {
    let transformer = this.createTransform(opts);

    return this.execFile(transformer, file);
  }

  transformFromAst(ast, code: string, opts: Object) {
    let transformer = this.createTransform(opts);
    return this.execFromAst(transformer, ast, code, opts);
  }
}
