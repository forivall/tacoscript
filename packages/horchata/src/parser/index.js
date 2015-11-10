/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../tokenizer/types";
import Lexer from "../tokenizer";
import SourceFile from "../file";
import {getLineInfo} from "../util/location";

// Registered plugins
export const plugins = {};

export default class Parser extends Lexer {
  static addPlugin(name, initializer) {
    let currentPlugin = plugins[name];
    if (currentPlugin != null && currentPlugin !== initializer) {
      throw new Error("Plugin '" + name + "' conflicts with another plugin");
    }
    plugins[name] = initializer;
  }

  constructor(options, input) {
    super(options, input);

    // Load plugins
    this.loadPlugins(this.options.plugins);
  }
  extend(name, f) {
    this[name] = f(this[name])
  }

  loadPlugins(pluginConfigs) {
    for (let name in pluginConfigs) {
      let plugin = plugins[name]
      if (!plugin) throw new Error("Plugin '" + name + "' not found")
      plugin(this, pluginConfigs[name])
    }
  }

  parse(text, metadata) {
    let file = new SourceFile(text, this.options, metadata);
    this.open(file); // set up tokenizer
    let program = this.startNode();
    this.nextToken();
    file = this.parseTopLevel(file, program);
    if (file.warnings.length > 0) console.warn("Parsing generated " + file.warnings.length + " warnings");
    return file;
  }

  // TODO: take a vinyl file as input, or vinyl-like file object
  parseFile() {
    throw new Error("Not Implemented");
  }

  //////// Utility methods ////////

  // Raise an unexpected token error
  unexpected(pos) {
    console.error(this.state.cur);
    this.raise(pos != null ? pos : this.state.cur.start, "Unexpected Token");
  }

  // This function is used to raise exceptions on parse errors. It
  // takes an offset integer (into the current `input`) to indicate
  // the location of the error, attaches the position to the end
  // of the error message, and then raises a `SyntaxError` with that
  // message.
  raise(pos, message) {
    throw this._createSyntaxError(pos, message);
  }

  warn(pos, message) {
    this.state.warnings.push(this._createSyntaxError(pos, message));
  }

  _createSyntaxError(pos, message) {
    let loc = getLineInfo(this.input, pos);
    let err = new SyntaxError(message + " (" + loc.line + ":" + loc.column + ")");
    err.pos = pos;
    err.loc = loc;
    err.raisedAt = this.pos;
    return err;

  }
}

import * as nodeMethods from "./methods/node";
import * as validationMethods from "./methods/validation";
import * as baseParsers from "./types/base";
import * as assignableParsers from "./types/assignable";
// import * as classesParsers from "./types/classes";
import * as expressionsParsers from "./types/expressions";
// import * as methodsParsers from "./types/methods";
// import * as modulesParsers from "./types/modules";
import * as statementsParsers from "./types/statements";
// import * as templateLiteralsParsers from "./types/template-literals";
// import * as typesParsers from "./types/types";
for (let parserMethods of [
      nodeMethods,
      validationMethods,
      baseParsers,
      assignableParsers,
      // classesParsers,
      expressionsParsers,
      // methodsParsers,
      // modulesParsers,
      statementsParsers,
      // templateLiteralsParsers,
      // typesParsers,
    ]) {
  Object.assign(Parser.prototype, parserMethods);
}
