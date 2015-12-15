/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../../tokenizer/types";
import Token from "../../tokenizer/token";

// Initialize empty function node.

export function initFunction(node) {
  node.id = null;
  node.generator = false;
  node.expression = false;
  node.async = false;
}

// Parse object or class method.
export function parseMethod(node, functionContext = {}, callbacks = {}) {
  let oldInMethod = this.state.inMethod;
  this.state.inMethod = node.kind || true;
  this.initFunction(node);
  node = this.parseFunctionParams(node, functionContext);
  node = this.parseArrowNamed(node, functionContext);
  let {afterArrowParse} = callbacks;
  if (afterArrowParse) afterArrowParse.call(this, node, functionContext);
  node = this.parseFunctionBody(node, functionContext);
  this.state.inMethod = oldInMethod;
  return node;
}

export function parseClassMethod(method, functionContext) {
  return this.parseMethod(method, functionContext, {
    afterArrowParse(method, functionContext) {
      if (method.kind === "constructor") {
        this.checkClassConstructorProperties(method);
      }
    }
  })
}

// Parse arrow function expression with given parameters.

// current token position is on the '*' or the arrow (of any arrow type)
// so the first job of this function is to figure out what kind of function this is.
export function parseArrowExpression(node) {
  this.initFunction(node);
  node.params = this.toArguments(node.params);
  node.generator = this.eat(tt.star);
  if (node.generator) this.assignToken(node, "generator", "*", {token: this.state.prev});

  let isArrowFunction;
  let arrow = {...this.state.cur};
  this.next();
  switch (arrow.type) {
    case tt.asyncBoundArrow:
      node.async = true;
      // fallthrough
    case tt.arrow:
      isArrowFunction = true;
      if (Token.isImplicitReturn(arrow)) {
        node = this.parseArrowExpressionFunction(node);
      } else {
        node = this.parseFunctionBody(node, {allowEmpty: true});
      }
      break;

    case tt.asyncArrow:
      node.async = true;
      // fallthrough
    case tt.unboundArrow:
      isArrowFunction = false;
      if (Token.isImplicitReturn(arrow)) {
        throw new Error("Not Implemented");
      } else {
        node = this.parseFunctionBody(node, {allowEmpty: true});
      }
      break;
    default: this.unexpected();
  }
  node = this.finishNode(node, isArrowFunction ? "ArrowFunctionExpression" : "FunctionExpression");
  return node;
}

export function parseArrowExpressionFunction(node) {
  // TODO: override to allow implicit return expressions with a body
  this.assign(node, "body", this.parseExpression());
  // TODO: move this to validation functions
  let expr = node.body;
  if (expr.type === "ObjectExpression" && !(expr.extra != null && expr.extra.parenthesized)) {
    this.addExtra(expr, "parenthesized", true);
    this.addExtra(expr, "fakeParens", true);
  }
  node.expression = true;
  this.checkArrowExpressionFunction(node);
  return node;
}

// Parse function body and check parameters.

export function parseFunctionBody(node, functionContext = {}) {
  let allowEmpty = !!functionContext.allowEmpty;
  // Start a new scope with regard to labels and the `inFunction`
  // flag (restore them to their old value afterwards).

  // TODO: pass this down in the recursive descent in a `scope` argument instead of
  // storing in state.
  let oldInFunc = this.state.inFunction;
  let oldInForHeader = this.state.inForHeader;
  let oldInGen = this.state.inGenerator;
  let oldLabels = this.state.labels;
  this.state.inFunction = true;
  this.state.inGenerator = node.generator;
  this.state.labels = [];

  this.assign(node, "body", this.parseBlock({allowDirectives: true, allowEmpty}));
  node.expression = false;

  this.state.inFunction = oldInFunc;
  this.state.inForHeader = oldInForHeader;
  this.state.inGenerator = oldInGen;
  this.state.labels = oldLabels;

  this.checkFunctionBody(node);
  return node;
}

export function parseFunctionDeclaration(node) {
  this.next();
  this.initFunction(node);
  node = this.parseFunctionNamed(node, {}, {isStatement: true});
  return this.finishNode(node, "FunctionDeclaration");
}

export function parseFunctionExpressionNamed() {
  let node = this.startNode();
  this.next();
  this.initFunction(node);
  node = this.parseFunctionNamed(node, {}, {allowEmpty: true});
  return this.finishNode(node, "FunctionExpression");
}

export function parseFunctionNamed(node, identifierContext, functionContext) {
  this.assign(node, "id", this.parseIdentifier(identifierContext));
  node = this.parseFunctionParams(node, functionContext);
  node = this.parseArrowNamed(node, functionContext);
  node = this.parseFunctionBody(node, functionContext);
  return node;
}

export function parseFunctionParams(node/*, functionContext*/) {
  this.eat(tt.parenL) || this.unexpected();
  return this.parseBindingList(node, "params", tt.parenR, {allowTrailingComma: true});
}

export function parseArrowNamed(node/*, functionContext*/) {
  node.generator = this.eat(tt.star);
  if (node.generator) this.assignToken(node, "generator", "*", {token: this.state.prev});
  if (Token.isImplicitReturn(this.state.cur)) {
    throw new Error("Not Implemented");
  }
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
