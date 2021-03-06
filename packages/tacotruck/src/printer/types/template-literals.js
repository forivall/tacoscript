
export function TaggedTemplateExpression(node) {
  this.print(node, "tag");
  this.print(node, "quasi");
}

export function TemplateElement(node) {
  // this._push(node.value.raw);
  this.push({type: "template", value: {...node.value, code: this.code.slice(node.start, node.end)}})
}

export function TemplateLiteral(node) {
  this.push("`");


  let quasis = node.quasis;

  for (let i = 0; i < quasis.length; i++) {
    this._print(quasis[i], node, {});

    if (i + 1 < quasis.length) {
      this.push("${");
      this._print(node.expressions[i], node, {});
      this.push("}");
    }
  }

  this._push("`");
}
