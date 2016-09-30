
import BaseContext from "./base-context";
import NodePath from "./path";

/**
 * this class duplicates comal-traverse TraversalContext, but just
 * maintains path and not scope or any rewriting stuff, or opts, or state.
 */

export default class WalkContext extends BaseContext {
  constructor(visitor, parentPath, queueVisitors) {
    super({
      noScope: true, // airhorn
      ...visitor.opts
    }, parentPath);

    this.visitor = visitor;
    this.queueVisitors = queueVisitors;
  }

  visitRoot(root) {
    if (Array.isArray(root)) {
      const pseudoRoot = {type: '<root>', root};
      return this.visitMultiple(pseudoRoot, pseudoRoot, 'root');
    }
    return this.visitSingle({type: '<root>', root}, 'root');
  }

  visitSingle(parent, key): boolean {
    return this.visitQueue([this.create(parent, parent, key)])
  }

  visitMultiple(container, parent, listKey) {
    if (container.length === 0) {
      if (this.queueVisitors.empty) this.queueVisitors.empty.call(this.visitor);
      return false;
    }

    return this.visitQueue(
      container.map((node, index) => this.create(
        parent,
        container,
        index,
        listKey
      ))
    )
  }

  visitQueue(paths: Array<NodePath>) {
    this.queue = paths;

    let visited = [];

    const qv = this.queueVisitors;

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
      if (path.node === null) {
        const pathId = (path.listKey || '') + '.' + path.key;
        if (visited.indexOf(pathId) >= 0) continue;
        visited.push(pathId);
      } else {
        if (visited.indexOf(path.node) >= 0) continue;
        visited.push(path.node);
      }

      // here, instead of using path.visit, we directly invoke our visitor
      this.visitor.visit(path);
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

// indicate to NodePath that this isn't the normal traversal, so automatically
// inherit context from parent path
WalkContext.prototype._autoInherit = true;
