/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "./tokenizer/types";
import {getOptions} from "./options";
import Lexer from "./tokenizer";

// Registered plugins
export const plugins = {};

export class Parser extends Lexer {
  constructor(options, input) {
    super(options, input);
    this.options = getOptions(options);
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

  parse() {
    let node = this.options.program || this.startNode()
    this.nextToken()
    return this.parseTopLevel(node)
  }
}
