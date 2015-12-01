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

export function assign(parent, key, value, token) {
  // TODO: store cst info
  // TODO: throw error if already set
  parent[key] = value;
  if (token) {
    // TODO: store cst info
  } else if (value != null && value.__isNode || value instanceof Node) {
    // TODO: store cst info
  } else {
    // warn or try to infer the relevent token
  }
  return value;
}

export function add(parent, key, node) {
  // TODO: store cst info
  (parent[key] == null ? parent[key] = [] : parent[key]).push(node);
  return node;
}

export function addExtra(parent, key, value) {
  (parent.extra == null ? parent.extra = {} : parent.extra)[key] = value;
  return value;
}

export function addRaw(node, token = this.state.cur) {
  this.addExtra(node, "raw", this.input.slice(token.start, token.end));
  return this.assignAsToken(node, token);
}

export function assignAsToken(node, token = this.state.cur) {
  // TODO: also store the cst token information here.
  return node;
}

export function assignToken(node, key, token) {
  // TODO: also store the cst token information here.
  return node;
}
