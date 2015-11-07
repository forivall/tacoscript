/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {SourceLocation} from "../util/location";

export default class Node {
  constructor(state, pos, loc, tokenIndex) {
    this.type = "";
    this.start = pos;
    this.end = 0;
    this.tokenStart = tokenIndex;
    this.tokenEnd = 0;
    if (state.options.locations) {
      this.loc = new SourceLocation(state, loc);
    }
    if (state.options.directSourceFile) {
      this.sourceFile = state.options.directSourceFile;
    }
    if (state.options.ranges) {
      this.range = [pos, 0];
    }
    if (state.options.sourceElements) {
      this.sourceElements = [];
    }
  }
}
