/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

// All code for adding cst data _during_ parsing is included in these methods.
// When an option to not add cst data is added, these functions should be
// overridden to not set (see http://jsperf.com/if-vs-override for approach)

import Node from "../node";
import {SourceLocation} from "../../util/location";

// Start an AST node, attaching location information.

export function startNode(token = this.state.cur) {
  let node = new Node(this, token);
  node._childReferences = [];
  return node;
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

export function _toChildReferenceToken(token, reference, value) {
  let element = {};
  if (reference) element.reference = reference;
  if (!reference || token.type.estreeValue !== null) element.value = token.value;
  else if (value != null) element.value = value;
  element = {
    ...element,
    element: token.type.alias,
    start: token.start,
    end: token.end,
    loc: token.loc.clone(),
    extra: {tokenValue: token.value, tokenIndex: token.index, tokenType: token.type.key},
  };
  return element;
}

export function popReference(parent, expected) {
  let el = parent._childReferences.pop();
  if (expected && el.reference !== expected) throw new Error("Replacing incorrect reference");
  return true;
}

export function assign(parent, key, value, options = {}) {
  // TODO: throw error if already set
  parent[key] = value;

  let {token} = options;
  if (token) {
    parent._childReferences.push(this._toChildReferenceToken(token, key));
  } else if (value != null) {
    if (value.__isNode || value instanceof Node) {
      // TODO: store cst info
      parent._childReferences.push({reference: key});
    } else {
      // warn or try to infer the relevent token
      console.log("assigning a non-node value without relevant token", parent, key);
    }
  }
  return value;
}

export function unassign(parent, key) {
  let value = parent[key];
  // Currently only supports unassigning simple values
  if (value.__isNode) throw new Error("Not Implemented")
  delete parent[key];

  // Update partial CST
  let el, index = -1;
  for (let i = 0, len = parent._childReferences.length; i < len; i++) {
    let testEl = parent._childReferences[i];
    if (testEl.reference === key) {
      index = i;
      el = testEl;
      break;
    }
  }
  if (index !== -1) {
    parent._childReferences.splice(index, 1);
  }
  return !!el;
}

export function assignRaw(node, key, value, options = {}) {
  let {token = this.state.cur} = options;
  // TODO: throw error if already set
  node[key] = value;
  let raw;
  if (options.noExtra) {
    raw = this.input.slice(token.start, token.end);
  } else {
    this.addRaw(node, token);
    raw = node.extra.raw;
  }
  node._childReferences.push(this._toChildReferenceToken(token, key, raw));
  return value;
}

export function add(parent, key, node, options = {}) {
  (parent[key] == null ? parent[key] = [] : parent[key]).push(node);

  // store cst info
  let {token} = options;
  let el = {reference: key + '#next'};

  // When the node cannot store its own data, it's stored here. Primarily used
  // for `pass`
  if (token) {
    el.element = token.type.alias;
    el.value = token.type.toCode(token, this.state);
    el.start = token.start;
    el.end = token.end;
    el.loc = token.loc.clone();
    el.extra = {tokenValue: token.value, tokenIndex: token.index};
  }
  parent._childReferences.push(el);
  return node;
}

export function addExtra(parent, key, value) {
  (parent.extra == null ? parent.extra = {} : parent.extra)[key] = value;
  return value;
}

export function addRaw(node, token = this.state.cur) {
  this.addExtra(node, "raw", this.input.slice(token.start, token.end));
}

export function assignToken(node, key, value, options = {}) {
  let {token = this.state.cur} = options;
  node._childReferences.push(this._toChildReferenceToken(token, key, value));
  return node;
}
