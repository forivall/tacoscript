/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import Node from "../node";

// Start an AST node, attaching location information.

export function startNode(token = this.state.cur) {
  return new Node(this, token);
}

// Finish an AST node, adding `type` and `end` properties.

export function finishNode(node, type, token = this.state.prev) {
  node.type = type;
  node.end = token.end;
  node.tokenEnd = token.index;
  if (this.options.locations) {
    node.loc.end = token.endLoc != null ? token.endLoc : token.loc.end;
  }
  if (this.options.ranges) {
    node.range[1] = token.end;
  }
  return node;
}
