/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../tokenizer/types";
import Lexer from "../tokenizer";
import SourceFile from "../file";

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
    this.nextToken()
    return this.parseTopLevel(file, program)
  }

  // TODO: take a vinyl file as input, or vinyl-like file object
  parseFile() {
    throw new Error("Not Implemented");
  }
}
