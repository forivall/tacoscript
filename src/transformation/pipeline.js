/* @noflow */

import normalizeAst from "../helpers/normalize-ast";
import Plugin from "./plugin";
import File from "./file";

export default class Pipeline {
  lint(code: string, opts?: Object = {}) {
    opts.code = false;
    opts.mode = "lint";
    return this.transform(code, opts);
  }

  pretransform(code: string, opts?: Object) {
    let file = new File(opts, this);
    return file.wrap(code, function () {
      file.addCode(code);
      file.parseCode(code);
      return file;
    });
  }

  transform(code: string, opts?: Object) {
    let file = new File(opts, this);
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
