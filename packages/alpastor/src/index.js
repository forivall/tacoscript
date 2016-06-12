// TODO: document acronym ACST = abstract/concrete syntax tree =
// ast with cst elements

import {render} from 'tacoscript-cst-utils';
// TODO: move a base file out of comal into comal-support
import {File} from 'comal';
import {NodePath} from 'comal-traverse';
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
    this.options = opts;
    this.tKey = opts.tacoscriptSourceElements;
    this.key = opts.sourceElements;
  }

  start(acst, opts) {
    if (this.file) throw new Error('not reentrant');
    const file = this.file = new File({filename: acst.filename || ''});

    const context = new VisitorContext(this);
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
      before(first) {
        console.log('before', first)
      },
      between(left, right) {
        console.log(left, right)
      },
      after(last) {
        console.log('last', last);
      }
    })
   */

  print(path, prop, visitors, key=this.tKey: string) {
    let context = new VisitorContext(this, path, visitors);
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
}
/**
 * this class duplicates comal-traverse TraversalContext, but just
 * maintains path and not scope or any rewriting stuff, or opts, or state.
 */
class VisitorContext {
  constructor(visitor, parentPath, qVisitors) {
    this.visitor = visitor;
    this.parentPath = parentPath;
    this.qVisitors = qVisitors;
  }

  create({parent, container, key, listKey}): NodePath {
    return NodePath.get({
      parentPath: this.parentPath,
      parent,
      container,
      key,
      listKey
    });
  }

  visit(node, key) {
    let nodes = node[key];

    return (Array.isArray(nodes)
      ? this.visitMultiple(node, nodes, key)
      : this.visitSingle(node, key)
    )
  }

  visitSingle(parent, key): boolean {
    return this.visitQueue([this.create({parent, container: parent, key})])
  }

  visitMultiple(parent, container, listKey) {
    if (container.length === 0) return false;
    return this.visitQueue(
      container.map((node, index) => this.create({
        parent,
        container,
        key: index,
        listKey
      }))
    )
  }

  visitQueue(paths: Array<NodePath>) {
    this.queue = paths;

    let visited = [];

    const qv = this.qVisitors;

    if (qv && qv.before) qv.before(paths[0]);

    let prevPath = null;

    for (const path of paths) {
      if (path.contexts.length === 0 || path.contexts[path.contexts.length - 1] !== this) {
        // The context might already have been pushed when this path was inserted and queued.
        // If we always re-pushed here, we could get duplicates and risk leaving contexts
        // on the stack after the traversal has completed, which could break things.
        path.pushContext(this);
      }

      if (qv) {
        if (qv.between && prevPath) qv.between(prevPath, path);
        if (qv.each) qv.each(path);
      }

      // TODO: see if this can be hashed to improve perf
      // ensure we don't visit the same node twice
      if (visited.indexOf(path.node) >= 0) continue;
      visited.push(path.node);

      // here, instead of using path.visit, we directly invoke our visitor
      // const visitResult =
      this.visitor.visit(path);
      // if visitResult is 'stop' then break
      // return value is if visitation was stopped
      prevPath = path;
    }

    if (qv && qv.after) qv.after(prevPath);

    // clear queue
    for (const path of paths) {
      path.popContext();
    }
    this.queue = null;

    return paths;
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
