/*
 * Copyright (C) 2012-2015 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../../tokenizer/types";
import {isIdentifierOrStringLiteral} from "../helpers";

// Parse a class declaration
export function parseClassDeclaration(node, classContext = {}) {
  this.next();
  node = this.parseClassId(node, classContext);
  node = this.parseClassSuper(node, classContext);
  node.body = this.parseClassBody(true, classContext);
  return this.finishNode(node, "ClassDeclaration");
}

// Parse a class expression literal
export function parseClassExpression(classContext = {}) {
  classContext.optionalId = true;
  let node = this.startNode();
  this.next();
  node = this.parseClassId(node, classContext);
  node = this.parseClassSuper(node, classContext);
  node.body = this.parseClassBody(false, classContext);
  return this.finishNode(node, "ClassExpression");
}

export function parseClassId(node, classContext) {
  let optionalId = !!classContext.optionalId;

  if (this.match(tt.name)) node.id = this.parseIdentifier();
  else if (optionalId) node.id = null;
  else this.unexpected();

  return node;
}

export function parseClassSuper(node) {
  node.superClass = this.eat(tt._extends) ? this.parseExpressionSubscripts({}) : null;
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
  node.body = [];

  let end;
  if (this.eat(tt.indent)) {
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

  while(!end()) {
    if (this.eatLineTerminator()) continue;

    if (this.match(tt.at)) {
      decorators.push(this.parseDecorator());
      continue;
    }

    let method = this.startNode();

    if (decorators.length) {
      method.decorators = decorators;
      decorators = [];
    }

    method.static = this.eat(tt._static);

    if (!this.matchNext(tt.eq) && !this.matchNext(tt.parenL)) {
      if (this.eat(tt._get)) {
        method.kind = "get";
      } else if (this.eat(tt._set)) {
        method.kind = "set";
      }
    }

    this.parsePropertyName(method);

    if (method.key.type === "Identifier" && !method.computed && method.kind !== "get" && method.kind !== "set") {
      if (this.isClassProperty()) {
        node.body.push(this.parseClassProperty(method));
        continue;
      } else if (method.key.name === "call" && this.match(tt.name) && this.state.cur.value === "constructor") {
        if (hasConstructorCall) {
          this.raise(method.start, "Duplicate constructor call");
        }
        method.kind = "constructorCall";
        hasConstructorCall = true;
      }
    }

    if (method.kind == null) method.kind = "method";

    if (!method.computed) {
      let isConstructor = this.isClassConstructor(method);
      if (isConstructor) {
        if (hasConstructor) this.raise(method.key.start, "Duplicate constructor");
        if (method.kind === "get") this.raise(method.key.start, "Constructor can't have get modifier");
        if (method.kind === "set") this.raise(method.key.start, "Constructor can't have set modifier");
        method.kind = "constructor";
        hasConstructor = true;
      }
      this.checkClassMethodName(method);
    }

    // disallow decorators on class constructors
    // TODO: move to check.
    if ((method.kind === "constructor" || method.kind === "constructorCall") && method.decorators) {
      this.raise(method.start, "You can't attach decorators to a class constructor");
    }

    method = this.parseClassMethod(method, classContext);

    if (method.kind === "get" || method.kind === "set") {
      this.checkGetterSetterProperty(method);
    }
    node.body.push(this.finishNode(method, "ClassMethod"));
  }

  if (decorators.length) this.raise(this.state.start, "Class has trailing decorators");
  node = this.finishNode(node, "ClassBody");
  this.state.strict = oldStrict;
  return node;
}

export function parseClassProperty(node) {
  node.value = this.eat(tt.eq) ?
    this.parseExpressionMaybeKeywordOrAssignment({}) : null;
  this.eatLineTerminator();
  return this.finishNode(node, "ClassProperty");
}
