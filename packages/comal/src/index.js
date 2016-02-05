import isFunction from "lodash/isFunction";
import fs from "fs";

//

export { default as File } from "./transformation/file";
export { default as options } from "./transformation/file/options/config";
export { default as template } from "babel-template";
export { version } from "../package.json";

//

import * as util from "./util";
export { util };

import * as t from "comal-types";
export { t as types };

import traverse from "comal-traverse";
export { traverse };

import OptionManager from "./transformation/file/options/option-manager";
export { OptionManager };

//

import Pipeline from "./transformation/pipeline";
export { Pipeline };

let pipeline = new Pipeline;
export let analyse = pipeline.analyse.bind(pipeline);
export let transform = pipeline.transform.bind(pipeline);
export let transformFromAst = pipeline.transformFromAst.bind(pipeline);

//

export function transformFile(filename: string, opts?: Object, callback: Function) {
  if (isFunction(opts)) {
    callback = opts;
    opts = {};
  }

  opts.filename = filename;

  fs.readFile(filename, function (err, code) {
    let result;

    if (!err) {
      try {
        result = transform(code, opts);
      } catch (_err) {
        err = _err;
      }
    }

    if (err) {
      callback(err);
    } else {
      callback(null, result);
    }
  });
}

export function transformFileSync(filename: string, opts?: Object = {}): string {
  opts.filename = filename;
  return transform(fs.readFileSync(filename, "utf8"), opts);
}
