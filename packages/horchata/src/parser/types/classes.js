/*
 * Copyright (C) 2012-2015 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015-2017 Emily Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../../lexer/types";
import {isIdentifierOrStringLiteral} from "../helpers";

// Parse a class declaration
export function parseClassDeclaration(node, classContext = {}) {
  this.consumeDecorators(node);

  this.next();
  node = this.parseClassId(node, classContext);
  node = this.parseClassSuper(node, classContext);
  this.assign(node, "body", this.parseClassBody(true, classContext));
  return this.finishNode(node, "ClassDeclaration");
}

// Parse a class expression literal
export function parseClassExpression(classContext = {}) {
  classContext.optionalId = true;
  let node = this.startNode();

  // TODO: start node at location of first decorator instead of class. maybe.
  this.consumeDecorators(node);

  this.next();
  node = this.parseClassId(node, classContext);
  node = this.parseClassSuper(node, classContext);
  this.assign(node, "body", this.parseClassBody(false, classContext));
  return this.finishNode(node, "ClassExpression");
}

export function parseClassId(node, classContext) {
  let optionalId = !!classContext.optionalId;

  if (this.match(tt.name)) this.assign(node, "id", this.parseIdentifier());
  else if (optionalId) node.id = null;
  else this.unexpected();

  return node;
}

export function parseClassSuper(node) {
  this.assign(node, "superClass", this.eat(tt._extends) ? this.parseExpressionSubscripts({}) : null);
  return node;
}

export function isClassProperty() {
  return this.match(tt.eq) || this.matchLineTerminator();
}

export function isClassConstructor(method) {
  return (
    method.kind !== "constructorCall" &&
    !method.static &&
    isIdentifierOrStringLiteral(method.key, "constructor") &&
  true);
}

export function parseClassBody(isDeclaration, classContext) {
  let node = this.startNode();
  let hasConstructor = false;
  let hasConstructorCall = false;
  let decorators = [];
  let isMultiline = false;
  node.body = [];

  let end;
  if (this.eat(tt.indent)) {
    isMultiline = true;
    end = () => this.eat(tt.dedent);
    this.eat(tt.newline);
  } else if (this.eat(tt._then)) {
    end = () => this.eat(tt.newline) || this.match(tt.eof);
  } else {
    if (isDeclaration) this.eatLineTerminator() || this.unexpected();
    return this.finishNode(node, "ClassBody");
  }

  // class bodies are implicitly strict
  let oldStrict = this.state.strict;
  this.state.strict = true;

  const strudelThisMember = this.hasFeature("strudelThisMember");

  while(!end()) {
    if (this.eatLineTerminator()) continue;

    if (this.matchDecoratorSymbol(strudelThisMember)) {
      decorators.push(this.parseDecorator());
      continue;
    }

    let method = this.startNode();

    if (decorators.length) {
      this.addAll(method, "decorators", decorators);
      decorators = [];
    }

    method.static = this.eat(tt._static);
    if (method.static) this.assignToken(method, "static", "static", {token: this.state.prev});


    if (!this.matchNext(tt.eq) && !this.matchNext(tt.parenL)) {
      if (this.eat(tt._get)) {
        this.assign(method, "kind", "get", {token: this.state.prev});
      } else if (this.eat(tt._set)) {
        this.assign(method, "kind", "set", {token: this.state.prev});
      }
    }

    method = this.parsePropertyName(method);

    if (method.key.type === "Identifier" && !method.computed && method.kind !== "get" && method.kind !== "set") {
      if (this.isClassProperty()) {
        this.add(node, "body", this.parseClassProperty(method));
        continue;
      } else if (method.key.name === "call" && this.match(tt.name) && this.state.cur.value === "constructor") {
        if (hasConstructorCall) {
          this.raise(method.start, "Duplicate constructor call");
        }
        this.assign(method, "kind", "constructorCall", {token: this.state.prev});
        hasConstructorCall = true;
      }
    }

    if (method.kind == null) method.kind = "method";

    if (!method.computed) {
      let isConstructor = this.isClassConstructor(method);
      if (isConstructor) {
        if (hasConstructor) this.raise(method.key.start, "Duplicate constructor");
        this.checkClassConstructorProperties(method);
        method.kind = "constructor";
        hasConstructor = true;
      }
      this.checkClassMethodName(method);
    }

    this.checkClassMethodProperties(method);
    method = this.parseClassMethod(method, classContext);

    if (method.kind === "get" || method.kind === "set") {
      this.checkGetterSetterProperty(method);
    }
    this.add(node, "body", this.finishNode(method, method.lexicallyBound ? "ClassArrowMethod" : "ClassMethod"));
  }

  if (decorators.length) this.raise(this.state.start, "Class has trailing decorators");

  if (!isDeclaration && isMultiline) {
    this.eat(tt.newline);
  }

  node = this.finishNode(node, "ClassBody");
  this.state.strict = oldStrict;
  return node;
}

export function parseClassProperty(node) {
  this.assign(node, "value", this.eat(tt.eq) ?
    this.parseExpressionMaybeKeywordOrAssignment({}) : null);
  this.eatLineTerminator();
  return this.finishNode(node, "ClassProperty");
}
