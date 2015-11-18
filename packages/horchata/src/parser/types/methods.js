/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../../tokenizer/types";


// Initialize empty function node.

export function initFunction(node) {
  node.id = null;
  node.generator = false;
  node.expression = false;
  node.async = false;
}

// Parse object or class method.

export function parseMethod(isGenerator) {
  let node = this.startNode();
  this.initFunction(node);
  this.eat(tt.parenL) || this.unexpected();
  node.params = this.parseBindingList(tt.parenR);
  node.generator = isGenerator;
  this.parseFunctionBody(node, false);
  return this.finishNode(node, "FunctionExpression");
}

// Parse arrow function expression with given parameters.

export function parseArrowExpression(node, params) {
  this.initFunction(node);
  throw new Error("Not Implemented")
  // node.params = this.toAssignableList(params, true);
  // this.parseFunctionBody(node, {isArrowFunction: true});
  // return this.finishNode(node, "ArrowFunctionExpression");
}

// Parse function body and check parameters.

export function parseFunctionBody(node, functionContext) {
  const {isArrowFunction} = functionContext;
  let isExpression = isArrowFunction && !this.match(tt._indent) || functionContext.isExpression;

  if (isExpression) {
    node.body = this.parseExpression();
    node.expression = true
  } else {
    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).

    // TODO: pass this down in the recursive descent in a `scope` argument instead of
    // storing in state.
    let oldInFunc = this.state.inFunction;
    let oldInGen = this.state.inGenerator;
    let oldLabels = this.state.labels;
    this.state.inFunction = true;
    this.state.inGenerator = node.generator;
    this.state.labels = [];

    node.body = this.parseBlock({allowDirectives: true});
    node.expression = false;

    this.state.inFunction = oldInFunc;
    this.state.inGenerator = oldInGen;
    this.state.labels = oldLabels;
  }

  this.checkFunctionBody(node, functionContext);
  return node;
}

export function parseFunctionDeclaration(node) {
  this.next();
  this.initFunction(node);
  node = this.parseFunctionNamed(node, {}, {isStatement: true});
  return this.finishNode(node, "FunctionDeclaration");
}

export function parseFunctionNamed(node, identifierContext, functionContext) {
  node.id = this.parseIdentifier(identifierContext);
  this.parseFunctionParams(node);
  this.parseFunctionArrow(node, functionContext);
  this.parseFunctionBody(node, functionContext);
  return node;
}

export function parseFunctionParams(node) {
  this.eat(tt.parenL) || this.unexpected();
  node.params = this.parseBindingList(tt.parenR, {allowTrailingComma: true});
}

export function parseFunctionArrow(node) {
  node.generator = this.eat(tt.star);
  switch(this.state.cur.type) {
    case (tt.arrow):
      throw new Error("Not Implemented");
      break;
    case (tt.unboundArrow):
      this.next();
      break;
    case (tt.asyncArrow):
      node.async = true
      this.next();
      break;
    case (tt.asyncBoundArrow):
      throw new Error("Not Implemented");
      break;
    default:
      this.unexpected();
  }
  return node;
}
