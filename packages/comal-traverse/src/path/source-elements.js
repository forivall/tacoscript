
import util from 'util';

import type NodePath from "./index";

export function srcEl() {
  return this.parent[this.opts.sourceElementsSource][this._getSrcElIndexPath(this)];
}

export function srcElBefore() {
  const i = this._getSrcElIndexPath(this);
  if (i === undefined) throw new Error('could not find source element for ' + this.key, this.listKey);
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
  if (rightI === undefined) throw new Error('could not find source element for ' + this.key, this.listKey);

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
      if (/#next$/.test(el.reference) > 0) {
        const name = el.reference.split('#')[0];
        (index[name] || (index[name] = [])).push(i);
      } else {
        if (index[el.reference]) {
          throw new Error(`Double reference to "${el.reference}"`);
        }
        index[el.reference] = i;
      }
    } else if (el.element === 'Keyword') {
      const key = `keyword#${el.value}`;
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
