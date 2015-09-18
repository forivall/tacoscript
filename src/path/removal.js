// This file contains methods responsible for removing a node.

import * as removalHooks from "./lib/removal-hooks";

/**
 * This is now safe.
 */

export var dangerouslyRemove = remove;

/**
 * Dangerously remove the current node. This may sometimes result in a tainted
 * invalid AST so use with caution.
 */

export function remove() {
  this._assertUnremoved();

  this.resync();

  if (this._callRemovalHooks("pre")) {
    this._markRemoved();
    return;
  }

  this.shareCommentsWithSiblings();
  this._remove();
  this._markRemoved();

  this._callRemovalHooks("post");
}

export function _callRemovalHooks(position) {
  for (var fn of (removalHooks[position]: Array)) {
    if (fn(this, this.parentPath)) return true;
  }
}

export function _remove() {
  if (Array.isArray(this.container)) {
    this.container.splice(this.key, 1);
    this.updateSiblingKeys(this.key, -1);
  } else {
    this._replaceWith(null);
  }
}

export function _markRemoved() {
  this.shouldSkip = true;
  this.removed    = true;
  this.node       = null;
}

export function _assertUnremoved() {
  if (this.removed) {
    throw this.errorWithNode("NodePath has been removed so is read-only.");
  }
}
