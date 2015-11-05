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

export class Parser extends Lexer {
  constructor(options, input) {
    super(options, input);
    this.sourceFile = this.options.sourceFile;
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

  // TODO: take a vinyl file as input, or vinyl-like file object
  parse(text, metadata) {
    let file = new SourceFile(text, this.options, metadata);
    this.open(file); // set up tokenizer
    let program = this.startNode();
    this.nextToken()
    return this.parseTopLevel(file, program)
  }
}
