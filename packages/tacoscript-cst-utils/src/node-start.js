export function startTarget(node) {
  if (
        node.type === "ClassMethod" ||
        node.type === "ObjectMethod" ||
        node.type === "ObjectProperty" ||
        node.type === "ClassDeclaration" ||
        node.type === "ClassExpression" ||
      false) {
    if (node.decorators != null && node.decorators.length > 0) {
      return node.decorators[0];
    }
  }
  return node;
}

export function startOf(node) {
  return startTarget(node).start;
}
export function startLocOf(node) {
  return startTarget(node).loc.start;
}
export function tokenStartOf(node) {
  return startTarget(node).tokenStart;
}
