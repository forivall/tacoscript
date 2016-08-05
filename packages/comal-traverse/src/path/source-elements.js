
import util from 'util';

import reversed from 'reversed';

import type NodePath from "./index";

export function srcEl() {
  return this.parent[this.opts.sourceElementsSource][this._getSrcElIndexPath(this)];
}

export function srcElBefore() {
  const i = this._getSrcElIndexPath(this);
  if (i === undefined) throw new Error('could not find source element for ' + this.getPathLocation());
  return this.parent[this.opts.sourceElementsSource].slice(0, i);
}

export function srcElAfter() {
  const i = this._getSrcElIndexPath(this);
  if (i === undefined) throw new Error('could not find source element for ' + this.key, this.listKey);
  return this.parent[this.opts.sourceElementsSource].slice(i + 1);
}

export function srcElUntil(right?: (NodePath | string | Function)): NodePath {
  if (right == null) return this.srcElAfter();

  const leftI = this._getSrcElIndexPath(this);
  if (leftI === undefined) throw new Error('could not find source element for ' + this.key, this.listKey);

  if (typeof right !== 'function') {
    const rightI = this._getSrcElIndexSibling(right);
    if (rightI === undefined) throw new Error('could not find source element for ' + util.inspect(right));
    return this.parent[this.opts.sourceElementsSource].slice(leftI + 1, rightI);
  }
  throw new Error('Not Implemented');
}

export function srcElSince(left: (NodePath | string | Function)): NodePath {
  if (left == null) return this.srcElBefore();

  const rightI = this._getSrcElIndexPath(this);
  if (rightI === undefined) throw new Error('could not find source element for ' + this.getPathLocation());

  if (typeof left !== 'function') {
    const leftI = this._getSrcElIndexSibling(left);
    if (leftI === undefined) throw new Error('could not find source element for ' + util.inspect(left));
    return this.parent[this.opts.sourceElementsSource].slice(leftI + 1, rightI);
  }
  throw new Error('Not Implemented');
}

export function _getSrcElIndexSibling(ref: (NodePath | string)): NodePath {
  if (typeof ref !== 'string') return this._getSrcElIndexPath(ref, true);

  if (ref.indexOf('#') > 0) throw new Error('Special paths not supported as strings');

  const index = this.parentPath._srcElIndexMap();
  return index[ref];
}

export function _getSrcElIndexPath(path: NodePath, sharedParent = false) {
  if (sharedParent && path.parent !== this.parent) throw new Error('Other path must share parent with this path');
  const index = path.parentPath._srcElIndexMap();
  return path.inList ? index[path.listKey][path.key] : index[path.key];
}

export function _srcElIndexMap() {
  const key = this.opts.sourceElementsSource;
  let index = this.getData(`sourceElementsIndexMap:${key}`);
  if (index) return index;

  index = Object.create(null);

  const sourceElements = this.node[key];

  const l = sourceElements.length;
  for (let i = 0; i < l; i++) {
    const el = sourceElements[i];

    if (el.reference) {
      if (/#next$/.test(el.reference)) {
        const name = el.reference.split('#')[0];
        (index[name] || (index[name] = [])).push(i);
      } else {
        if (index[el.reference]) {
          throw new Error(`Double reference to "${el.reference}"`);
        }
        index[el.reference] = i;
      }
    } else if (el.element === 'Keyword') {
      const key = `keyword!${el.value}`;
      if (index[key] !== undefined) {
        if (Array.isArray(index[key])) {
          index[key].push(i);
        } else {
          index[key] = [index[key], i];
        }
      } else {
        index[key] = i;
      }
    }
  }

  this.setData(`sourceElementsIndexMap:${key}`, index);

  return index;
}

export function indent() {
  return this._leadingWhitespace()[0];
}

// traverses up down our children and up our parents until we find out what our leading whitespace is
// TODO: cache the results
export function _leadingWhitespace(whitespace = []) {
  let broken = false;
  let end = false;
  if (this.parentPath == null) {
    return [[], false];
  }
  const srcElBefore = this.srcElBefore();
  for (const srcEl of reversed(srcElBefore)) {
    const typeName = srcEl.element;
    if (typeName === 'WhiteSpace' || typeName === 'WhiteSpaceLeading') {
      whitespace.unshift(srcEl);
    } else if (srcEl.reference && !srcEl.value) {
      const childPath = this.parentPath.getRef(srcEl, true);
      const [childWhitespace, childBroken, childEnd] = childPath._leadingWhitespace();
      if (childEnd) {
        end = childEnd;
        whitespace = childWhitespace;
        break;
      } else if (childBroken) {
        whitespace = childWhitespace;
      } else {
        whitespace = childWhitespace.concat(whitespace);
      }
    } else if (
      typeName === 'CommentHead' ||
      typeName === 'CommentBody' ||
      typeName === 'CommentTail' ||
    false) {
      // do nothing
    } else if (typeName === 'LineTerminator') {
      end = true;
      break;
    } else {
      whitespace = [];
      broken = true;
    }
  }
  if (!end) {
    return this.parentPath._leadingWhitespace(whitespace);
  }
  return [whitespace, broken, end];
}

export function lastSrcEl(test = (() => true), key = this.opts.sourceElementsSource) {
  if (this.parentPath == null) {
    return null;
  }
  const els = this.node[key]
  if (els == null) return null;
  for (const [i, srcEl] of reversed(els).entries()) {
    const typeName = srcEl.element;
    if (srcEl.reference && !srcEl.value) {
      const childPath = this.getRef(srcEl, true);
      const childResult = childPath.lastSrcEl(test, key);
      if (childResult !== null) return childResult;
    } else if (test(srcEl)) {
      return {
        el: srcEl,
        index: i,
        path: this,
        node: this.node
      };
    }
  }
  return null;
}
