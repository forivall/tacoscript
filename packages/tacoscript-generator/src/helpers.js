
export function willCatchUpBetween(nodes, parent) {
  let prevNode = nodes[0], first = true;
  for (let i = 1, len = nodes.length, nextNode;
      nextNode = nodes[i], i < len; i++) {
    if (prevNode && first) {
      first = false;
      if (parent && willCatchUpLeading(parent, prevNode)) return true;
    }
    if (nextNode) {
      if (prevNode != null && prevNode.loc.end.line < nextNode.loc.start.line) return true;
      prevNode = nextNode
    }
  }
  if (parent && willCatchUpTrailing(parent, prevNode)) return true;
  return false;
}

export function willCatchUpLeading(node, firstChild) {
  if (firstChild == null) return false;
  return node.loc.start.line < firstChild.loc.start.line;
}
export function willCatchUpTrailing(node, lastChild) {
  if (lastChild == null) return false;
  return lastChild.loc.end.line < node.loc.end.line;
}

export function isEmpty(nodes) {
  return nodes == null || nodes.length === 0;
}
