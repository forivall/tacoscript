
export function takeDecorators(node) {
  node.decorators = this.state.decorators;
  this.state.decorators = [];
  return node;
}

export function takeDecoratorsMaybe(node) {
  if (this.state.decorators.length) return takeDecorators(node);
  return node;
}
