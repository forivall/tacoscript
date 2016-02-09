
import { version } from "../package.json";

import File from "./file";
import coreOptions from "./options/core-config";
import fileOptions from "./options/file-config";
import template from "babel-template";

import * as util from "./util";
import * as types from "comal-types";
import traverse from "comal-traverse";
import OptionsLoader from "./options/loader";

import isFunction from "lodash/isFunction";
import fs from "fs";

import Pipeline from "./transformation/pipeline";

export default class Api {
  comalVersion = version;
  File = File;
  coreOptions = coreOptions;
  fileOptions = fileOptions;
  template = template;
  util = util;
  types = types;
  traverse = traverse;
  OptionsLoader = OptionsLoader;
  Pipeline = Pipeline;

  constructor(meta) {
    this.transformFile = this.transformFile.bind(this);
    this.transformFileSync = this.transformFileSync.bind(this);

    let pipeline = new Pipeline(meta, this);
    // this.analyse = pipeline.analyse.bind(pipeline);
    this.transform = pipeline.transform.bind(pipeline);
    this.transformFromAst = pipeline.transformFromAst.bind(pipeline);
  }

  transformFile(filename: string, opts?: Object, callback: Function) {
    if (isFunction(opts)) {
      callback = opts;
      opts = {};
    }

    opts.filename = filename;

    fs.readFile(filename, "utf8", (err, code) => {
      let result;

      if (!err) {
        try {
          result = this.transform(code, opts);
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

  transformFileSync(filename: string, opts?: Object = {}): string {
    opts.filename = filename;
    return this.transform(fs.readFileSync(filename, "utf8"), opts);
  }
}
