
export function ClassDeclaration(node) {
  this.printMultiple(node, "decorators", { separator: null });
  if (node.decorators && node.decorators.length) this.newline();
  this.push("class");

  if (node.id) {
    this.print(node, "id");
  }

  if (node.typeParameters) this.print(node, "typeParameters");

  if (node.superClass) {
    this.push("extends");
    this.print(node, "superClass");
    if (node.superTypeParameters) this.print(node, "superTypeParameters");
  }

  if (node.implements) {
    this.push("implements");
    this.printMultiple(node, "implements", { separator: "," });
  }

  // NOTE: this is a classBody, not a block
  this.print(node, "body");
}

export function ClassExpression(node) {
  if (node.parenthesizedExpression) this.push("(");
  this.ClassDeclaration(node);
  if (node.parenthesizedExpression) this.push(")");
}

export function ClassBody(node) {
  this.indent();
  this.newline();
  // TODO: this.printInnerComments(node);
  if (node.body.length === 0) {
    // this.push("pass");
  } else {
    this.printStatements(node, "body");
  }
  this.dedent();
}

export function ClassProperty(node) {
  this.printMultiple(node, "decorators", { separator: null });

  if (node.static) this.push("static");
  this.print(node, "key");
  if (node.typeAnnotation) this.print(node, "typeAnnotation");
  if (node.value) {
    this.push("=");
    this.print(node, "value");
  }
  this.newline();
}

export function MethodDefinition(node) {
  this.printMultiple(node, "decorators", { separator: null });

  if (node.static) {
    this.push("static");
  }

  this._method(node);
  this.newline();
}
