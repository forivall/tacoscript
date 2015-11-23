// "atomics" and types.
// TOOD: rename "types" in generator to "literals"

// this file is roughly equivalent to lval from acorn and babylon
// and also contains content from expression in acorn/babel
// Ident(ifier), Templates, Obj literal, Obj binding, properties, array literals & bindings

// this differs from acorn and babylon in that this function checks the token's
// type so that custom lval patterns can be invented. If someone wants to do
// that. >_<

import { types as tt } from "../../tokenizer/types";

export function convertLeftAssign(node, tokType) {
  if (tokType === tt.eq) {
    return this.toAssignable(node);
  }
  return node;
}

export function convertRightAssign(node/*, tokType*/) {
  return node;
}

// Convert existing, already parsed expression atom to assignable pattern
// if possible.
export function toAssignable(node, assignableContext = {}) {
  if (node == null) return node;
  const {isBinding} = assignableContext;
  // TODO: finish converting this function.
  switch (node.type) {
    case "Identifier":
    case "ObjectPattern":
    case "ArrayPattern":
      // already assignable
      break

    // TODO: rcreate a child object that is a "Converter" that performs these kinds
    // of tasks
    case "ObjectExpression":
      node.type = "ObjectPattern";
      for (let i = 0; i < node.properties.length; i++) {
        let prop = node.properties[i];
        if (prop.kind !== "init") this.raise(prop.key.start, "Object pattern can't contain getter or setter");
        this.toAssignable(prop.value, assignableContext);
      }
      break

    case "ArrayExpression":
      node.type = "ArrayPattern";
      this.toAssignableList(node.elements, assignableContext);
      break

    case "AssignmentExpression":
      if (node.operator === "=") {
        node.type = "AssignmentPattern";
        delete node.operator;
        // falls through to AssignmentPattern
      } else {
        this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
        break;
      }

    case "AssignmentPattern":
      if (node.right.type === "YieldExpression") {
        this.raise(node.right.start, "Yield expression cannot be a default value");
      }
      break;

    case "ParenthesizedExpression":
      node.expression = this.toAssignable(node.expression, assignableContext);
      break;

    case "MemberExpression":
      if (!isBinding) break;

    default:
      this.raise(node.start, "Assigning to rvalue");
  }
  return node;
}

// Convert list of expression atoms to binding list.
export function toAssignableList(exprList, assignableContext = {}) {
  const {isBinding} = assignableContext;
  let end = exprList.length;
  if (end) {
    let last = exprList[end - 1];
    if (last && last.type == "RestElement") {
      --end;
    } else if (last && last.type == "SpreadElement") {
      // Convert SpreadElement to RestElement
      last.type = "RestElement";
      let node = last.argument;
      node = this.toAssignable(node, assignableContext);
      if (node.type !== "Identifier" && node.type !== "MemberExpression" && node.type !== "ArrayPattern") {
        this.unexpected(node.start);
      }
      --end;
    }

    if (isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier") {
      this.unexpected(last.argument.start);
    }
  }
  for (let i = 0; i < end; i++) {
    exprList[i] = this.toAssignable(exprList[i], assignableContext);
  }
  return exprList
}

export function toArguments(elements) {
  return this.toAssignableList(elements, {isBinding: true});
}

// equivalent to parseVarId / parseVarHead
export function parseDeclarationAssignable(node) {
  node.id = this.parseBindingAtomic();
  this.checkAssignable(node.id, {isBinding: true});
  return node;
}

// Parses lvalue (assignable) atom.
// equivalent to parseBindingAtom
export function parseBindingAtomic() {
  switch (this.state.cur.type) {

    case tt.name:
      return this.parseIdentifier();

    case tt.bracketL:
      let node = this.startNode();
      this.next();
      node.elements = this.parseBindingList(tt.bracketR, {allowEmpty: true, allowTrailingComma: true});
      return this.finishNode(node, "ArrayPattern");

    case tt.braceL:
      return this.parseObjectBinding();

    default:
      this.unexpected();
  }
}

// TODO: refactor list code for parseBindingList, parseParenAndDistinguishExpression,
// parseExpressionList, and parseObjectLiteral to share newline-as-separator code
export function parseBindingList(close, bindingListContext = {}) {
  const {allowEmpty, allowTrailingComma} = bindingListContext;
  let elements = [];
  let indented = false;
  let first = true;
  while (!this.eat(indented ? tt.dedent : close)) {
    if (!indented) {
      indented = this.eat(tt.indent);
      if (indented && first) first = false;
    }
    if (first) {
      first = false;
    } else {
      this.eat(tt.comma) || indented && this.eat(tt.newline) || this.unexpected();
    }

    let node;
    if (allowEmpty && this.eat(tt._pass)) {
      node = null;
    } else if (allowTrailingComma && this.eat(indented ? tt.dedent : close)) {
      break;
    } else if (this.match(tt.ellipsis)) {
      node = this.parseRest();
      // TODO: allow ellipsis after newline just before close
      this.match(indented ? tt.dedent : close) || this.unexpected();
    } else {
      node = this.parseMaybeDefault();
    }
    node = this.parseAssignableListItemTypes(node);
    elements.push(node);
  }
  if (indented) {
    this.eat(tt.newline) && this.eat(close) || this.unexpected();
  }
  return elements;
}

// for flow? probably.
export function parseAssignableListItemTypes(param) {
  return param;
}

// Parses assignment pattern around given atom if possible.
export function parseMaybeDefault(start, left) {
  if (start == null) start = {...this.state.cur};
  if (left == null) left = this.parseBindingAtomic();
  let node;
  if (this.eat(tt.eq)) {
    node = this.startNode(start);
    node.left = left;
    node.right = this.parseExpression();
    node = this.finishNode(node, "AssignmentPattern");
  } else {
    node = left;
  }
  return node;
}

// Parse the next token as an identifier. If `allowKeywords` is true (used
// when parsing properties), it will also convert keywords into
// identifiers, including the token type.
export function parseIdentifier(identifierContext = {}) {
  // equivalent to `liberal` in acorn/babylon
  const allowKeywords = !!identifierContext.allowKeywords;

  let node = this.startNode();
  if (this.match(tt.name)) {
    this.checkIdentifierName(identifierContext);
    node.name = this.state.cur.value.value;
  } else if (allowKeywords && this.state.cur.type.keyword) {
    node.name = this.state.cur.type.keyword;
    this.state.cur.type = tt.name;
    // TODO: set this value accordingly
    // this.state.cur.value = {}
  } else {
    this.unexpected();
  }

  this.next();
  return this.finishNode(node, "Identifier");
}

export function parseLiteral(value, type) {
  let node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.state.cur.start, this.state.cur.end);
  this.next();
  return this.finishNode(node, type);
}

// override me to implement array comprehensions, etc.
export function parseArrayLiteral(expressionContext) {
  let node = this.startNode();
  this.next();
  node.elements = this.parseExpressionList(tt.bracketR, {...expressionContext, allowEmpty: true, allowTrailingComma: true});
  return this.finishNode(node, "ArrayExpression");
}

// TODO: use for call expressions.
export function parseExpressionList(close, expressionContext) {
  const {allowEmpty, allowTrailingComma} = expressionContext;
  let elements = [];
  let indented = false;
  let first = true;
  while (!this.eat(indented ? tt.dedent : close)) {
    if (!indented) {
      indented = this.eat(tt.indent);
      if (indented && first) first = false;
    }
    if (first) {
      first = false;
    } else {
      this.eat(tt.comma) || indented && this.eat(tt.newline) || this.unexpected();
    }

    let node;
    if (allowEmpty && this.eat(tt._pass)) {
      node = null;
    } else if (allowTrailingComma && this.eat(indented ? tt.dedent : close)) {
      break;
    } else if (this.match(tt.ellipsis)) {
      node = this.parseSpread(expressionContext);
      // TODO: allow ellipsis after newline just before close
      this.match(indented ? tt.dedent : close) || this.unexpected();
    } else {
      node = this.parseExpression();
    }
    elements.push(node);
  }
  if (indented) {
    this.eat(tt.newline) && this.eat(close) || this.unexpected();
  }
  return elements;
}

// Parse an object literal
export function parseObjectLiteral(expressionContext) {
  return this.parseObject(false, expressionContext);
}

// Parse an object binding pattern
export function parseObjectBinding() {
  return this.parseObject(true, {});
}

export function parseObject(isPattern, expressionContext) {
  let decorators = [];
  let propHash = Object.create(null);
  let first = true;
  let indented = false;
  let node = this.startNode();
  node.properties = [];

  this.next();

  while (!this.eat(indented ? tt.dedent : tt.braceR)) {
    if (!indented) {
      indented = this.eat(tt.indent);
      if (indented && first) first = false;
    }
    if (first) {
      first = false;
    } else {
      // TODO: make sure that functions only consume the dedent, not the newline
      this.eat(tt.comma) || indented && (this.eat(tt.newline) || this.matchPrev(tt.newline)) || this.unexpected();
      if (this.eat(indented ? tt.dedent : tt.braceR)) break;
    }
    let propertyContext = {};

    while (this.match(tt.at)) {
      decorators.push(this.parseDecorator());
    }

    let prop;
    let start;
    if (decorators.length > 0) {
      prop.decorators = decorators;
      decorators = [];
    }
    if (this.match(tt.ellipsis)) {
      prop = isPattern ? this.parseRest() : this.parseSpread();
    } else {
      prop = this.startNode();
      prop.method = false;
      prop.shorthand = false;

      if (isPattern || expressionContext.shorthandDefaultPos) {
        start = {...this.state.cur};
      }

      if (!isPattern && !this.matchNext(tt.colon) && !this.matchNext(tt.parenL)) {
        if (this.eat(tt._get)) {
          propertyContext.kind = "get";
        } else if (this.eat(tt._set)) {
          propertyContext.kind = "set";
        }
      }

      prop = this.parsePropertyName(prop);
      prop = this.parsePropertyValue(prop, start, isPattern, propertyContext, expressionContext);
      this.checkPropClash(prop, propHash);
    }
    node.properties.push(prop);
  }
  if (indented) {
    this.eat(tt.newline) && this.eat(tt.braceR) || this.unexpected();
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression");
}

export function parsePropertyName(prop) {
  if (this.eat(tt.bracketL)) {
    prop.computed = true;
    prop.key = this.parseExpression();
    this.eat(tt.bracketR) || this.unexpected();
  } else {
    prop.computed = false;
    prop.key = (this.match(tt.num) || this.match(tt.string))
      ? this.parseExpressionAtomic()
      : this.parseIdentifier({allowKeywords: true});
  }
  return prop;
}

export function parsePropertyValue(prop, start, isPattern, propertyContext, expressionContext) {
  if (propertyContext.kind === "get" || propertyContext.kind === "set") {
    prop.kind = propertyContext.kind;
    prop = this.parseMethod(prop);
    this.checkGetterSetterProperty(prop);
    prop = this.finishNode(prop, "ObjectMethod");
  } else if (this.match(tt.parenL)) {
    prop.kind = "method";
    prop.method = true;
    prop = this.parseMethod(prop, {allowEmpty: true});
    prop = this.finishNode(prop, "ObjectMethod");
  } else if (this.eat(tt.colon)) {
    prop.kind = "init";
    prop.value = isPattern
      ? this.parseMaybeDefault()
      : this.parseExpression(expressionContext);
    prop = this.finishNode(prop, "ObjectProperty");
  } else if (!prop.computed && prop.key.type === "Identifier") {
    prop.kind = "init";
    if (isPattern) {
      this.checkShorthandPropertyBinding(prop);
      prop.value = this.parseMaybeDefault(start, prop.key.__clone());
    } else if (this.match(tt.eq) && expressionContext.shorthandDefaultPos) {
      if (!expressionContext.shorthandDefaultPos.start) {
        expressionContext.shorthandDefaultPos.start = this.state.cur.start;
      }
      prop.value = this.parseMaybeDefault(start, prop.key.__clone());
    } else {
      prop.value = prop.key.__clone();
    }
    prop.shorthand = true;
    prop = this.finishNode(prop, "ObjectProperty");
  } else {
    this.unexpected();
  }
  return prop;
}
