/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../../tokenizer/types";
import {isIdentifierOrStringLiteral} from "../helpers";

// To be overridden by plugins
// equivalent to "toReferencedList" in babylon, used by flow plugin
export function checkReferencedList(expressions) { return expressions; }

// equivalent to "checkLVal"
// will be used by a validator plugin
export function checkAssignable(node, assignableContext = {}) {
  let isBinding = !!assignableContext.isBinding;
  let checkClashes = !!assignableContext.checkClashes;
  // TODO
}

export function checkClassMethodName(method) {
  // disallow static prototype method
  if (method.static && isIdentifierOrStringLiteral(method.key, "prototype")) {
    this.raise(method.key.start, "Classes may not have static property named prototype");
  }
}

export function checkClassConstructorProperties(method) {
  // note that this function gets called twice, once before parsing the
  // arguments and once after parsing the arrow
  if (method.kind === "get") this.raise(method.key.start, "Constructor can't have get modifier");
  if (method.kind === "set") this.raise(method.key.start, "Constructor can't have set modifier");
  if (method.generator) this.raise(method.key.start, "Constructor can't be a generator");
  if (method.async) this.raise(method.key.start, "Constructor can't be an async function");
}

export function checkClassMethodProperties(method) {
  // disallow decorators on class constructors
  if ((method.kind === "constructor" || method.kind === "constructorCall") && method.decorators) {
    this.raise(method.start, "You can't attach decorators to a class constructor");
  }
}

export function checkDeclaration(decl, kind, declarationContext) {
  if (!decl.init) {
    const isFor = !!declarationContext.isFor;
    if (kind === tt._const && !this.matchForKeyword()) {
      // const requires an initializer or use in `for ... in` or `for ... of`
      this.unexpected();
    } else if (decl.id.type !== "Identifier" && !(isFor && this.matchForKeyword())) {
      this.raise(this.state.prev.end, "Complex binding patterns require an initialization value");
    }
  }
  return decl;
}

export function checkDecorators() {
  // TODO
  // checks are moved to other functions, so that plugins can override them for extended syntax.
  // i.e. allow adding decorators to standalone functions
  // let allowExport = this.state.statementAllowed
}

export function checkExpressionOperatorLeft(node) {
  let left = node.left;

  if (node.operator === "**" && left.type === "UnaryExpression" && left.extra && !left.extra.parenthesizedArgument) {
    this.raise(left.argument.start, "Illegal expression. Wrap left hand side or entire exponentiation in parentheses.");
  }
}

export function checkExpression(node, expressionContext) {
  let pos = expressionContext.shorthandDefaultPos && expressionContext.shorthandDefaultPos.start;
  if (pos) this.raise(pos, "Shorthand property assignments are valid only in destructuring patterns");
}

export function checkFunctionBody(node) {
  // the following is from babylon.

  // If this is a strict mode function, verify that argument names
  // are not repeated, and it does not try to bind the words `eval`
  // or `arguments`.
  let checkLVal = this.state.strict;
  let checkLValStrict = false;
  let isStrict = false;

  // normal function
  if (node.body.directives.length) {
    for (let directive of (node.body.directives: Array<Object>)) {
      if (directive.value.value === "use strict") {
        isStrict = true;
        checkLVal = true;
        checkLValStrict = true;
        break;
      }
    }
  }

  //
  if (isStrict && node.id && node.id.type === "Identifier" && node.id.name === "yield") {
    this.raise(node.id.start, "Binding yield in strict mode");
  }

  if (checkLVal) {
    this.checkFunctionAssignable(node, checkLValStrict);
  }
}

export function checkArrowExpressionFunction(node) {
  this.checkFunctionAssignable(node);
}

export function checkExport(node) {
  if (this.state.decorators.length) {
    let isClass = node.declaration && (node.declaration.type === "ClassDeclaration" || node.declaration.type === "ClassExpression");
    if (!node.declaration || !isClass) {
      this.raise(node.start, "Decorators can only be used on an export when exporting a class");
    }
  }
};

export function checkFunctionAssignable(node, setStrict) {
  let nameHash = Object.create(null);
  let oldStrict = this.state.strict;
  if (setStrict) this.state.strict = true;
  if (node.id) {
    this.checkAssignable(node.id, {isBinding: true});
  }
  for (let param of (node.params: Array<Object>)) {
    this.checkAssignable(param, {isBinding: true, checkClashes: nameHash});
  }
  this.state.strict = oldStrict;
}

export function checkGetterSetterProperty(prop) {
  let paramCount = prop.kind === "get" ? 0 : 1;
  if (prop.params.length !== paramCount) {
    let start = prop.start;
    if (prop.kind === "get") {
      this.raise(start, "getter should have no params");
    } else {
      this.raise(start, "setter should have exactly one param");
    }
  }
}

export function checkIdentifierName(identifierContext) {
  const allowKeywords = !!identifierContext.allowKeywords;
  // TODO: see if this still triggers with escaped words in
  if (!allowKeywords && !this.state.containsEsc && (this.state.strict ? this.reservedWordsStrict : this.reservedWords).test(this.state.cur.value.value)) {
    this.raise(this.state.cur.start, "The keyword '" + this.state.cur.value.value + "' is reserved");
  }
}

export function checkJump(node, keyword) {
  let isBreak = keyword === "break";
  // Verify that there is an actual destination to break or
  // continue to.
  let i;
  for (i = 0; i < this.state.labels.length; ++i) {
    let label = this.state.labels[i];
    if (node.label == null || label.name === node.label.name) {
      if (label.kind != null && (isBreak || label.kind === "loop")) break;
      if (node.label && isBreak) break;
    }
  }
  // if not found
  if (i === this.state.labels.length) this.raise(node.start, "Unsyntactic " + keyword);
}

export function checkLabelName(name, labelNode) {
  for (let i = 0; i < this.state.labels.length; ++i) {
    let label = this.state.labels[i];
    if (label.name === name) {
      this.raise(labelNode.start, "Label '" + name + "' is already declared");
    }
  }
}

export function checkMetaProperty(node) {
  if (!this.state.inFunction && !this.options.allowNewTargetOutsideFunction) {
    this.raise(node.start, "new.target can only be used in functions");
  }
}

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

export function checkParams(node) {
  let nameHash = {};
  for (let i = 0; i < node.params.length; i++) {
    this.checkAssignable(node.params[i], true, nameHash);
  }
}

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.
export function checkPropClash(prop, propHash) {
  if (prop.computed) return;

  let {key} = prop;
  let name;

  switch (key.type) {
    case "Identifier": name = key.name; break;
    case "StringLiteral": case "NumericLiteral": name = String(key.value); break;
    default: return;
  }
  let {kind} = prop;
  if (name === "__proto__" && kind === "init") {
    if (propHash.proto) this.raise(key.start, "Redefinition of __proto__ property");
    propHash.proto = true
  }
}

export function checkPropRedefinition(name, prop, propHash) {
  name = "$" + name;
  let other = propHash[name]
  if (other) {
    let isGetSet = kind !== "init"
    if ((this.strict || isGetSet) && other[kind] || !(isGetSet ^ other.init))
      this.raise(key.start, "Redefinition of property")
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    }
  }
  other[kind] = true;
}

export function checkShorthandPropertyBinding(prop) {
  // TODO: allow if escaped
  if (this.keywordsJs.test(prop.key.name) ||
      (this.state.strict ? this.reservedWordsStrictBind : this.reservedWords).test(prop.key.name)) {
    this.raise(prop.key.start, "Binding " + prop.key.name);
  }
}

export function preCheckSuper() {
  if (!this.state.inMethod && !this.options.allowSuperOutsideMethod) {
    this.raise(this.state.cur.start, "`super` can only be used in a method")
  }
}

export function checkSuper(node) {
  if (this.match(tt.parenL) && this.state.inMethod !== "constructor" && !this.options.allowSuperOutsideMethod) {
    this.raise(node.start, "super() outside of class constructor");
  }
}

export function checkTryStatement(node) {
  if (!node.handler && !node.finalizer) {
    this.raise(node.start, "Missing catch or finally clause");
  }
}

export function checkWithStatementAllowed() {
  if (this.state.strict) this.raise(this.state.cur.start, "'with' in strict mode");
}

// TODO: add the following as a plugin
/*
parser.extend("checkTryStatement", function(inner) {
  if (!node.handler && !node.finalizer) {
    node.handler = this.startNode()
    let param = this.startNode();
    param.name = "_";
    node.handler.param = this.finishNode(param, "Identifier");
    let body = this.startNode();
    body = this.initBlockBody(body, {});
    node.handler.body = this.finishNode(param, "BlockStatement");
  }
  return inner.call(this);
});
*/

export function checkUnaryExpression(node) {
  return;
  // TODO: move to plugin
  if (this.state.strict && node.operator === "delete" &&
      node.argument.type === "Identifier") {
    this.raise(node.start, "Deleting local variable in strict mode");
  }
}

export function isOctalValid() {
  return true;
  // return !this.state.strict;
}
