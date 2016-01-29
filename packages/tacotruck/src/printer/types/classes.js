
import * as t from "babel-types";

export function _printClass(node) {
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

  if (node.body.leadingSeparators) {
    if (!node.body.body.length) this.push("then")
    for (let i = node.body.leadingSeparators; i > 0; --i) this.push(";;");
  }

  // NOTE: this is a classBody, not a block
  this.print(node, "body");
}

export function ClassDeclaration(node) {
  this._printClass(node);
  this.newline();
}
export function ClassExpression(node, parent) {
  // TODO: check this.format.parenthesizeClassExpressions
  let needsParens = t.isClass(parent) && parent.superClass === node;
  if (needsParens) this.push("(");
  this._printClass(node);
  if (needsParens) this.push(")");
}

export function ClassBody(node) {
  this.indent();
  this.printInnerComments(node);
  if (node.body.length === 0) {
    // this.push("pass");
  } else {
    this.lineTerminator();
    this.printStatements(node, "body");
  }
  this.dedent();

  if (this.format.preserveLines) {
    let lastChild;
    for (let i = node.body.length - 1; i >= 0; i--) if ((lastChild = node.body[i]) != null) break;
    if (lastChild) {
      this._catchUp(node.loc.end.line - lastChild.loc.end.line, node);
      this._prevCatchUp = node;
    }
  }
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
  this.lineTerminator();
}

export function MethodDefinition(node) {
  this.printMultiple(node, "decorators", { separator: null });

  if (node.static) {
    this.push("static");
  }

  this._method(node);
  this.lineTerminator();
}

export function ClassMethod(node) {
  this.printMultiple(node, "decorators", { separator: null });

  if (node.static) {
    this.push("static");
  }

  if (node.kind === "constructorCall") {
    this.push({type: "name", value: {value: "call", raw: "call"}})
  }

  this._method(node, true);
  this.lineTerminator();
}
