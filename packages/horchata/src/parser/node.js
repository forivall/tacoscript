/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {Parser} from "./index";
import {SourceLocation} from "../util/location";

export class Node {
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
  }
}

// Start an AST node, attaching a start offset.

const pp = Parser.prototype;

pp.startNode = function() {
  return new Node(this, this.start, this.startLoc, Math.max(0, this.tokens.length - 1));
}

pp.startNodeOn = function(tokenIndex) {
  let token = this.tokens[tokenIndex];
  return new Node(this, token.start, token.loc.start);
}

// Finish an AST node, adding `type` and `end` properties.

pp._finishNodeAt = function(node, type, pos, loc, tokenIndex) {
  node.type = type;
  node.end = pos;
  node.tokenEnd = tokenIndex;
  if (this.options.locations) {
    node.loc.end = loc;
  }
  if (this.options.ranges) {
    node.range[1] = pos;
  }
  return node;
}

pp.finishNode = function(node, type) {
  return this._finishNodeAt(node, type, this.lastTokEnd, this.lastTokEndLoc, this.tokens.length - 1);
}

// Finish node at given position

pp.finishNodeOn = function(node, type, tokenIndex) {
  let token = this.tokens[tokenIndex];
  return this._finishNodeAt(node, type, token.end, token.loc.end, tokenIndex);
}
