/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015-2017 Emily Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {SourceLocation} from "../util/location";

export default class Node {
  constructor(state, token) {
    this.type = "";
    this.start = token.start;
    this.end = 0;
    this.tokenStart = token.index;
    this.tokenEnd = 0;
    if (state.options.locations) {
      this.loc = new SourceLocation(state, token.startLoc != null ? token.startLoc : token.loc.start);
    }
    if (state.options.directSourceFile) {
      this.sourceFile = token.sourceFile || state.options.directSourceFile;
    }
    if (state.options.ranges) {
      this.range = [token.start, 0];
    }
    if (state.options.sourceElements) {
      this._sourceElementsKey = state.options.sourceElementsKey || 'sourceElements';
      this[this._sourceElementsKey] = [];
    }
  }

  __clone() {
    let clone = new Node({options: {}}, {});
    for (let k in this) clone[k] = this[k];
    if ("range" in this) {
      clone.range = [this.range[0], this.range[1]];
    }
    if ("sourceElements" in this) {
      clone.sourceElements = [];
    }
    return clone;
  }

  toJSON() {
    let out = {};
    for (let k of (Object.keys(this): Array)) {
      if (k[0] !== "_") {
        out[k] = this[k];
      }
    }
    return out;
  }
}
Object.defineProperty(Node.prototype, "__isNode", {value: true});
