// TODO: document acronym ACST = abstract/concrete syntax tree =
// ast with cst elements

import {render} from 'tacoscript-cst-utils';
// TODO: move a base file out of comal into comal-support
import {File} from 'comal';
import {WalkContext} from 'comal-traverse';
import type {NodePath} from 'comal-traverse';
import type {Node} from 'horchata/lib/parser/node';
import includes from 'lodash/includes';
import find from 'lodash/find';

export function generate(acst, opts) {
  opts = opts || {};
  const sourceElementsKey = opts.sourceElements = opts.sourceElements || 'sourceElements';
  if (!opts.tacoscriptSourceElements) opts.tacoscriptSourceElements = 'tacoscriptSourceElements';
  const visitor = new Visitor(opts);
  visitor.start(acst, opts);
  return {
    code: render(acst, sourceElementsKey),
    ast: acst
  };
}

export class Visitor {
  constructor(opts) {
    this.opts = opts;
    this.tKey = opts.tacoscriptSourceElements;
    this.key = opts.sourceElements;
  }

  start(acst, opts) {
    if (this.file) throw new Error('not reentrant');
    const file = this.file = new File({filename: acst.filename || ''});

    const context = new WalkContext(this);
    let out;
    if (Array.isArray(acst)) {
      const pseudoRoot = {type: '<root>', cst: acst};
      out = context.visitMultiple(pseudoRoot, pseudoRoot, 'cst');
    } else {
      out = context.visitSingle({type: '<root>', cst: acst}, 'cst');
    }

    this.file = null;
    return out;
  }

  visit(path) {
    const node = path.node;
    if (node) {
      if (!this[node.type]) {
        throw new Error('Cannot print node of type "' + node.type + '"')
      }
      this[node.type](path, node);
    }
  }

  /**
   * usage:
    this.print(path, 'program', {
      before: (first) => {
        console.log('before', first)
      },
      between: (left, right) => {
        console.log(left, right)
      },
      after: (last) => {
        console.log('last', last);
      }
    })
   */

  print(path, prop, visitors, key=this.tKey: string) {
    let context = new WalkContext(this, path, visitors);
    context.visit(path.node, prop);
  }

  get(path: NodePath, prop, key=this.tKey: string) {
    return find(path.node[key], {reference: prop});
  }

  includes(sourceElements, value) {
    return includes(sourceElements, {value});
  }

  before(path, key=this.tKey: string) {
    return this.between(null, path);
  }

  // returns the original source elements between the two given paths
  between(leftPath: NodePath|string, rightPath: NodePath|string, key=this.tKey: string) {
    if (typeof leftPath === 'string') {
      if (typeof rightPath === 'string') throw new Error('both paths cannot be strings. use *Ref instead')
      leftPath = rightPath.parentPath.get(leftPath);
    }
    if (typeof rightPath === 'string') {
      rightPath = leftPath.parentPath.get(rightPath);
    }
    // feel free to refactor this function
    if (leftPath == null && rightPath == null) throw new Error('Left or right path must be defined');
    if (leftPath && leftPath.parent == null || rightPath && rightPath.parent == null) {
      throw new Error('Both paths must have a parent');
    }
    if (leftPath != null && rightPath != null) {
      if (leftPath.parent !== rightPath.parent) throw new Error('Both paths must share a parent');
    }
    const parent = leftPath == null ? rightPath.parent : leftPath.parent;
    const sourceElements = parent[key];
    let leftI = 0;
    let rightI = sourceElements.length;

    if (leftPath) {
      const reference = leftPath.inList ? leftPath.listKey + '#next': leftPath.key;
      let skip = leftPath.inList ? leftPath.key : 0;
      for (const l = sourceElements.length; skip >= 0 && leftI < l; leftI++) {
        const sourceElement = sourceElements[leftI];
        if (sourceElement.reference === reference) skip--;
      }
    }

    if (rightPath) {
      // TODO: start from leftI and the proper count
      // We don't start from leftI since we want to make sure that the count is
      // correct in case that the path is inList
      rightI = 0;
      const reference = rightPath.inList ? rightPath.listKey + '#next': rightPath.key;
      let skip = rightPath.inList ? rightPath.key : 0;
      for (const l = sourceElements.length; skip >= 0 && rightI < l; rightI++) {
        const sourceElement = sourceElements[rightI];
        if (sourceElement.reference === reference) skip--;
      }
      // we only want the elements before the found index, so offset by 1
      if (rightI > 0) rightI--;
    }
    return sourceElements.slice(leftI, rightI); // TODO
  }

  after(path) {
    return this.between(path, null);
  }

  beforeRef(parent: Node, ref: string, key=this.tKey) {
    return this.betweenRef(parent, null, ref, key);
  }

  // returns the original source elements between the two given paths
  betweenRef(parent: Node, leftRef: string, rightRef: string, key=this.tKey) {
    // feel free to refactor this function
    if (leftRef == null && rightRef == null) throw new Error('Left or right reference must be defined');
    const sourceElements = parent[key];
    let leftI = 0;
    let rightI = sourceElements.length;

    if (leftRef) {
      if (leftRef.includes('#')) throw new Error('special paths are not supported');
      for (const l = sourceElements.length; leftI < l; leftI++) {
        const sourceElement = sourceElements[leftI];
        if (sourceElement.reference === leftRef) {
          leftI++; // move past the element
          break;
        }
      }

    }

    if (rightRef) {
      if (rightRef.includes('#')) throw new Error('special paths are not supported');
      rightI = leftI;
      for (const l = sourceElements.length; rightI < l; rightI++) {
        const sourceElement = sourceElements[rightI];
        if (sourceElement.reference === rightRef) break;
      }
    }
    return sourceElements.slice(leftI, rightI); // TODO
  }

  afterRef(parent: Node, ref: string, key = this.tKey) {
    return this.betweenRef(parent, ref, null, key);
  }

  ref(parent: Node, ref: string, key = this.tKey) {
    if (ref.includes('#')) throw new Error('special paths are not supported');
    for (const sourceElement of parent[key]) {
      if (sourceElement.reference === ref) {
        return sourceElement;
      }
    }
  }
}

import * as baseGenerators from "./types/base";
// import * as classesGenerators from "./types/classes";
// import * as expressionsGenerators from "./types/expressions";
import * as literalsGenerators from "./types/literals";
// import * as methodsGenerators from "./types/methods";
// import * as modulesGenerators from "./types/modules";
import * as statementsGenerators from "./types/statements";
// import * as templateLiteralsGenerators from "./types/template-literals";
for (let generator of [
      baseGenerators,
      // classesGenerators,
      // expressionsGenerators,
      literalsGenerators,
      // methodsGenerators,
      // modulesGenerators,
      statementsGenerators,
      // templateLiteralsGenerators,
    ]) {
  Object.assign(Visitor.prototype, generator);
}
