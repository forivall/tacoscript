
import * as t from "babel-types";
// TODO: create a "horchata-types" and switch to it

export function _params(node) {
  if (node.typeParameters) this.print(node, "typeParameters");
  this.printArguments(node, "params", {
    iterator: (node) => {
      // for flow
      if (node.optional) this.push("?")
      if (node.typeAnnotation) this.print(node, "typeAnnotation");
    }
  });
}

/**
 * Prints a function body, like printBlock
 */

export function _functionBody(parent, prop = "body") {
  let node = parent[prop];
  let opts = {};
  if (t.isBlock(node)) {
    this.indent();
    if (node.body.length > 0) { this.newline(); }
    this._startPrint(parent, prop, opts);
    this.printStatements(node, prop, opts);
    this._finishPrint(node, opts);
    this.dedent();
  // } else if (t.isEmptyStatement(node)) {
  //   // probably not needed
  //   this.push({type: 'pass', after: [';', '\n']}, parent, prop, opts);
  } else {
    throw new Error("Invalid Function body");
  }
  // TODO: transform to tacoscript nodes for implicit return forms
}

/**
 * Prints method-like nodes, prints key, value, and body, handles async, generator, computed, and get or set.
 */

export function _method(node: Object) {
  let value = node.value;
  let kind  = node.kind;

  if (kind === "get" || kind === "set") {
    this.push(kind);
  }

  if (node.computed) {
    this.push("[");
    this.print(node, "key");
    this.push("]");
  } else {
    this.print(node, "key");
  }

  this._params(value);

  if (kind === "method" || kind === "init") {
    if (value.generator) {
      this.push("*");
    }
  }
  if (node.async) {
    this.push("~>");
  } else {
    this.push("->");
  }

  this._functionBody(value);
}

/**
 * Prints FunctionExpression, prints id and body, handles async and generator.
 */

export function FunctionExpression(node, parent) {
  if (node.parenthesizedExpression) this.push("(");
  if (node.id) {
    this.push("function");
    this.print(node, "id");
  }
  this._finishFunction(node, parent);
  if (node.parenthesizedExpression) this.push(")");
}

/**
 * Prints FunctionDeclaration, prints id and body, handles async and generator.
 */

export function FunctionDeclaration(node, parent) {
  this.push("function");
  if (node.id) {
    this.print(node, "id");
  }
  this._finishFunction(node, parent);
  this.newline(); // note: won't be printed if there's already a newline
}

export function _finishFunction(node, parent) {
  this._params(node);

  if (node.generator) this.push("*");
  if (node.async) {
    this.push("~>");
  } else {
    this.push("->");
  }
  this._functionBody(node);
}

/**
 * Prints ArrowFunctionExpression, prints params and body, handles async.
 * Leaves out parentheses when single param.
 */

export function ArrowFunctionExpression(node, parent) {
  if (node.params.length === 1 && t.isIdentifier(node.params[0])) {
    this.print(node.params[0], node);
  } else {
    this._params(node);
  }

  if (t.isBlock(node.body)) {
    if (node.async) {
      this.push("~=>");
    } else {
      this.push("=>");
    }
    this._functionBody(node);
  } else {
    if (node.async) {
      this.push("~=>>");
    } else {
      this.push("=>>");
    }
    this.print(node, "body");
  }

}

// TODO: SharpArrowFunctionExpression
// TODO: SharpFunctionExpression
// TODO: SharpFunctionDeclaration
