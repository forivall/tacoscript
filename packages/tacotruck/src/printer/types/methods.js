
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
    if ((node[prop].length + (node.directives == null ? 0 : node.directives.length)) > 0) { this.startBlock(); }
    this.startPrint(parent, prop, opts);
    if (node.directives) this.printStatements(node, 'directives', opts);
    this.printStatements(node, prop, opts);
    this._finishPrint(node, parent, opts);
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

export function _method(node, isValue) {
  let value = isValue ? node : node.value;
  let kind  = node.kind;

  if (this.format.preserveLines) {
    this.catchUp(node.key, node);
  }

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

  this._finishFunction(value, node);
}

/**
 * Prints FunctionExpression, prints id and body, handles async and generator.
 */

export function FunctionExpression(node, parent) {

  let isCallee = t.isCallExpression(parent) && node === parent.callee; // TODO: better needsParens testing
  let needsParens = isCallee;
  if (needsParens) this.push("(");

  if (node.id) {
    this.push("function");
    this.print(node, "id");
  }
  this._finishFunction(node, parent);
  if (needsParens) {
    if (this.format.preserveLines && isCallee && parent.arguments[0] != null) {
      this.catchUp(parent.arguments[0], parent);
    }
    this.push(")");
  }
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

export function _finishFunction(node) {
  this._params(node);

  if (node.generator) this.push("*");
  if (node.async) {
    this.push("+>");
  } else {
    this.push("->");
  }
  this._functionBody(node);
}

/**
 * Prints ArrowFunctionExpression, prints params and body, handles async.
 * TODO: Preserve if parens were included for a single argument
 */

export function ArrowFunctionExpression(node) {
  this._params(node);

  if (t.isBlock(node.body)) {
    if (node.async) {
      this.push("+=>");
    } else {
      this.push("=>");
    }
    this._functionBody(node);
  } else {
    if (node.async) {
      this.push("+=>>");
    } else {
      this.push("=>>");
    }
    this.print(node, "body");
  }
}

// TODO: SharpArrowFunctionExpression
// TODO: SharpFunctionExpression
// TODO: SharpFunctionDeclaration
