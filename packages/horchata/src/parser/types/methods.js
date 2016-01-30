/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../../lexer/types";

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
    afterArrowParse(method/*, functionContext*/) {
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
  let generatorPos;
  if (node.generator) {
    this.assignToken(node, "generator", "*", {token: this.state.prev});
    generatorPos = this.state.prev.start;
  }

  let isArrowFunction, implicitReturn;
  let arrow = this.state.cur;
  this.next();
  switch (arrow.value) {
    case '+=>': case '+=>>':
      node.async = true;
      // fallthrough
    case '=>': case '=>>':
      if (node.generator && !this.options.allowArrowFunctionGenerators) {
        this.raise(generatorPos, "Arrow functions cannot be generators")
      }
      isArrowFunction = true;
      implicitReturn = arrow.value === '=>>' || arrow.value === '+=>>';
      if (implicitReturn && !this.hasFeature('implicitReturnFunctions')) {
        node = this.parseArrowExpressionFunction(node);
      } else {
        node = this.parseFunctionBody(node, {allowConcise: true, implicitReturn});
        if (implicitReturn) node = this.maybeTransformArrowFunctionBody(node);
      }
      break;

    case '+>': case '+>>':
      node.async = true;
      // fallthrough
    case '->': case '->>':
      isArrowFunction = false;
      let functionContext = {allowConcise: true};
      if (arrow.value === '->>' || arrow.value === '+>>') {
        functionContext.implicitReturn = true;
      }
      node = this.parseFunctionBody(node, functionContext);
      break;
    default: this.unexpected();
  }
  node = this.finishNode(node, isArrowFunction ? "ArrowFunctionExpression" : "FunctionExpression");
  return node;
}

export function parseArrowExpressionFunction(node) {
  const indent = this.eat(tt.indent);
  if (indent) this.eat(tt.newline);
  // TODO: override to allow implicit return expressions with a body
  this.assign(node, "body", this.parseExpression());
  if (indent) {
    this.eat(tt.newline);
    this.eat(tt.dedent) || this.unexpected();
  }
  // TODO: move this to validation functions
  this.ensureArrowExpressionBodyMetadata(node.body);
  node.expression = true;
  this.checkArrowExpressionFunction(node);
  return node;
}

export function ensureArrowExpressionBodyMetadata(expr) {
  if (expr.type === "ObjectExpression" && !(expr.extra != null && expr.extra.parenthesized)) {
    this.addExtra(expr, "parenthesized", true);
    this.addExtra(expr, "fakeParens", true);
  }
}

// Parse function body and check parameters.

export function parseFunctionBody(node, functionContext = {}) {
  let allowConcise = !!functionContext.allowConcise;
  let implicitReturn = !!functionContext.implicitReturn;
  // Start a new scope with regard to labels and the `inFunction`
  // flag (restore them to their old value afterwards).

  // TODO: pass this down in the recursive descent in a `scope` argument instead of
  // storing in state.
  let oldInFunc = this.state.inFunction;
  let oldinForHeaderInit = this.state.inForHeaderInit;
  let oldInGen = this.state.inGenerator;
  let oldLabels = this.state.labels;
  this.state.inFunction = true;
  this.state.inGenerator = node.generator;
  this.state.labels = [];

  this.assign(node, "body", this.parseBlock({allowDirectives: true, allowConcise, implicitReturn}));
  node.expression = false;

  this.state.inFunction = oldInFunc;
  this.state.inForHeaderInit = oldinForHeaderInit;
  this.state.inGenerator = oldInGen;
  this.state.labels = oldLabels;

  this.checkFunctionBody(node);
  return node;
}

export function parseFunctionDeclaration(node, functionContext = {}) {
  this.next();
  this.initFunction(node);
  functionContext.isStatement = true;
  functionContext.allowConcise = true;
  node = this.parseFunctionNamed(node, {}, functionContext);
  return this.finishNode(node, node.lexicallyBound ? "ArrowFunctionDeclaration" : "FunctionDeclaration");
}

export function parseFunctionExpressionNamed() {
  let node = this.startNode();
  this.next();
  this.initFunction(node);
  node = this.parseFunctionNamed(node, {}, {allowConcise: true});
  return this.finishNode(node, node.lexicallyBound ? "NamedArrowFunctionExpression" : "FunctionExpression");
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

export function parseArrowNamed(node, functionContext) {
  node.generator = this.eat(tt.star);
  if (node.generator) this.assignToken(node, "generator", "*", {token: this.state.prev});
  this.match(tt.arrow) || this.unexpected();

  switch (this.state.cur.value) {
    case '->>': case '=>>': case '+>>': case '+=>>':
      if (this.hasFeature('implicitReturnFunctions')) functionContext.implicitReturn = true;
      else this.raise(this.state.cur.start, '"implicitReturnFunctions" not enabled');
  }

  switch (this.state.cur.value) {
    case '=>': case '=>>': case '+=>': case '+=>>':
      if (this.hasFeature('lexicallyBoundNamedFunctions')) node.lexicallyBound = true;
      else this.raise(this.state.cur.start, '"lexicallyBoundNamedFunctions" not enabled');
  }

  switch (this.state.cur.value) {
    case '+>': case '+>>': case '+=>': case '+=>>':
      node.async = true;
      // fallthrough
    case '->': case '->>': case '=>': case '=>>':
      this.next();
      break;
    default:
      this.unexpected();
  }
  return node;
}

export function maybeTransformArrowFunctionBody(node) {
  let body = node.body;
  if (body.type === "ImplicitReturnBlockStatement" && body.body.length === 1 && body.body[0].type === "ExpressionStatement") {
    let expr = body.body[0].expression;

    node.body = expr;
    this.ensureArrowExpressionBodyMetadata(node.body);
    node.expression = true;
    this.checkArrowExpressionFunction(node);

    if (body.start != null) expr.start = body.start;
    if (body.end != null) expr.end = body.end;
    if (body.tokenStart != null) expr.tokenStart = body.tokenStart;
    if (body.tokenEnd != null) expr.tokenEnd = body.tokenEnd;
    if (body.loc != null) expr.loc = body.loc;
  }
  return node;
}
