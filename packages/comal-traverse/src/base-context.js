
import NodePath from "./path";

/**
 * Base class for traversal-context and walker-context
 *
 * Subclasses must implement visitMultiple, visitSingle and visitQueue
 */
export default class Context {
  constructor(opts, parentPath) {
    this.parentPath = parentPath;
    this.opts = opts;
  }

  parentPath: NodePath;
  opts;
  queue: ?Array<NodePath> = null;

  create(parent, container, key, listKey): NodePath {
    return NodePath.get({
      parentPath: this.parentPath,
      parent,
      container,
      key,
      listKey
    });
  }

  visit(node, key) {
    const nodes = node[key];

    return (Array.isArray(nodes)
      ? this.visitMultiple(nodes, node, key)
      : this.visitSingle(node, key)
    )
  }
}
