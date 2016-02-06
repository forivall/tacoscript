/* @noflow */

import normalizeAst from "../helpers/normalize-ast";
import Plugin from "./plugin";
import File from "../file";
import Transformation from "./index";

import Logger from "./logger";

export default class Pipeline {
  constructor(optMeta) {
    this.optionMeta = optMeta;
  }

  transform(code: string, opts?: Object) {
    let transformer = new Transformation(this.optionMeta, opts, this);
    let file = new File(new OptionLoader(fileOptMeta, this.log).load(opts));

    return file.wrap(code, function () {
      file.addCode(code);
      file.parseCode(code);
      return file.transform();
    });
  }

  analyse(code: string, opts: Object = {}, visitor?) {
    opts.code = false;
    if (visitor) {
      opts.plugins = opts.plugins || [];
      opts.plugins.push(new Plugin({ visitor }));
    }
    return this.transform(code, opts).metadata;
  }

  transformFromAst(ast, code: string, opts: Object) {
    ast = normalizeAst(ast);

    let file = new File(opts, this);
    return file.wrap(code, function () {
      file.addCode(code);
      file.addAst(ast);
      return file.transform();
    });
  }
}
