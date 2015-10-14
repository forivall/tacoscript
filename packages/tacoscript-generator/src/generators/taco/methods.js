
import * as t from "babel-types";
// TODO: create a "horchata-types" and switch to it

export function _params(node) {
  this.print(node, "typeParameters");
  this.printArguments(node, "params", {
    iterator: (node) => {
      // for flow
      if (node.optional) this.push("?")
      this.print(node, "typeAnnotation");
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
    this._startPrint(parent, prop, opts);
    this.printStatements(node, prop, opts);
    this._finishPrint(node, opts);
    this.dedent();
  // } else if (t.isEmptyStatement(node)) {
  //   // probably not needed
  //   this.push({type: 'pass', after: [';', '\n']}, parent, prop, opts);
  } else {
    // This is a single statement with no surrounding braces
    if (t.isArrowFunctionExpression(parent)) {
      this.keyword("return");
    }
    this.print(parent, prop);
  }
  // TODO: transform to tacoscript nodes for implicit return forms
}

/**
 * Prints method-like nodes, prints key, value, and body, handles async, generator, computed, and get or set.
 */

export function _method(node: Object) {
  let value = node.value;
  let kind  = node.kind;
  let key   = node.key;

  if (kind === "method" || kind === "init") {
    if (value.generator) {
      this.push("*");
    }
  }

  if (kind === "get" || kind === "set") {
    this.push(kind + " ");
  }

  if (value.async) this.push("async ");

  if (node.computed) {
    this.push("[");
    this.print(key, node);
    this.push("]");
  } else {
    this.print(key, node);
  }

  this._params(value);
  this.space();
  this.print(value.body, value);
}

/**
 * Prints FunctionExpression, prints id and body, handles async and generator.
 */

export function FunctionExpression(node, parent) {
  if (node.id) {
    this.push("function");
    this.print(node, "id");
  }
  this._finishFunction(node, parent);
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

  if (node.async) {
    this.push("~=>");
  } else {
    this.push("=>");
  }

  this._functionBody(node);
}

// TODO: ImplicitReturnArrowFunctionExpression
// TODO: ImplicitReturnFunctionExpression
// TODO: ImplicitReturnFunctionDeclaration
