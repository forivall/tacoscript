// TODO: document acronym ACST = abstract/concrete syntax tree =
// ast with cst elements

import {render} from 'tacoscript-cst-utils';
// TODO: move a base file out of comal into comal-support
import {File} from 'comal';
import {NodePath} from 'comal-traverse';

export function generate(acst, opts) {
  opts = opts || {};
  const sourceElementsKey = opts.sourceElements = opts.sourceElements || 'sourceElements';
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
    this.key = opts.sourceElements;
  }

  start(acst, opts) {
    if (this.file) throw new Error('not reentrant');
    const file = this.file = new File({filename: acst.filename || ''});

    // TODO: make sure that acst is a file, or wrapped in one if it's a program

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
    this[node.type](path, node);
  }

  print(path, prop) {
    let context = new VistorContext(this, path);
    context.visit(path.node, key);
  }
}
/**
 * this class duplicates comal-traverse TraversalContext, but just
 * maintains path and not scope or any rewriting stuff, or opts, or state.
 */
class VisitorContext {
  constructor(visitor, parentPath) {
    this.visitor = visitor;
    this.parentPath = parentPath;
  }

  create({parent, container, key, listKey}): traverse.NodePath {
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

    for (const path of paths) {
      if (path.contexts.length === 0 || path.contexts[path.contexts.length - 1] !== this) {
        // The context might already have been pushed when this path was inserted and queued.
        // If we always re-pushed here, we could get duplicates and risk leaving contexts
        // on the stack after the traversal has completed, which could break things.
        path.pushContext(this);
      }

      // TODO: see if this can be hashed to improve perf
      // ensure we don't visit the same node twice
      if (visited.indexOf(path.node) >= 0) continue;
      visited.push(path.node);

      // here, instead of using path.visit, we directly invoke our visitor
      // const visitResult =
      this.visitor.visit(path);
      // if visitResult is 'stop' then break
    }

    // clear queue
    for (const path of paths) {
      path.popContext();
    }
    this.queue = null;
  }
}

import * as baseGenerators from "./types/base";
// import * as classesGenerators from "./types/classes";
// import * as expressionsGenerators from "./types/expressions";
// import * as literalsGenerators from "./types/literals";
// import * as methodsGenerators from "./types/methods";
// import * as modulesGenerators from "./types/modules";
// import * as statementsGenerators from "./types/statements";
// import * as templateLiteralsGenerators from "./types/template-literals";
for (let generator of [
      baseGenerators,
      // classesGenerators,
      // expressionsGenerators,
      // literalsGenerators,
      // methodsGenerators,
      // modulesGenerators,
      // statementsGenerators,
      // templateLiteralsGenerators,
    ]) {
  Object.assign(Visitor.prototype, generator);
}
