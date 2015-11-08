/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import Node from "../node";

// Start an AST node, attaching a start offset.

export function startNode() {
  return new Node(this, this.start, this.startLoc, Math.max(0, this.state.tokens.length - 1));
}

export function startNodeOn(tokenIndex) {
  let token = this.state.tokens[tokenIndex];
  return new Node(this, token.start, token.loc.start);
}

// Finish an AST node, adding `type` and `end` properties.

export function _finishNodeAt(node, type, pos, loc, tokenIndex) {
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

export function finishNode(node, type) {
  return this._finishNodeAt(node, type, this.lastTokEnd, this.lastTokEndLoc, this.state.tokens.length - 1);
}

// Finish node at given position

export function finishNodeOn(node, type, tokenIndex) {
  let token = this.state.tokens[tokenIndex];
  return this._finishNodeAt(node, type, token.end, token.loc.end, tokenIndex);
}
