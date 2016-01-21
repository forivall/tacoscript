// "atomics" and types.
// TOOD: rename "types" in generator to "literals"

// this file is roughly equivalent to lval from acorn and babylon
// and also contains content from expression in acorn/babel
// Ident(ifier), Templates, Obj literal, Obj binding, properties, array literals & bindings

// this differs from acorn and babylon in that this function checks the token's
// type so that custom lval patterns can be invented. If someone wants to do
// that. >_<

import {types as tt} from "../../lexer/types";

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
    case "AssignmentPattern":
      // already assignable
      break;

    // TODO: rcreate a child object that is a "Converter" that performs these kinds
    // of tasks
    case "ObjectExpression":
      node.type = "ObjectPattern";
      for (let i = 0; i < node.properties.length; i++) {
        let prop = node.properties[i];
        if (prop.kind !== "init") this.raise(prop.key.start, "Object pattern can't contain getter or setter");
        this.toAssignable(prop.value, assignableContext);
      }
      break;

    case "ArrayExpression":
      node.type = "ArrayPattern";
      this.toAssignableList(node.elements, assignableContext);
      break;

    case "AssignmentExpression":
      if (node.operator === "=") {
        node.type = "AssignmentPattern";
        this.unassign(node, "operator");
      } else {
        this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
        break;
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
  this.assign(node, "id", this.parseBindingAtomic());
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
      node = this.parseBindingList(node, "elements", tt.bracketR, {allowEmpty: true, allowTrailingComma: true});
      return this.finishNode(node, "ArrayPattern");

    case tt.braceL:
      return this.parseObjectBinding();

    default:
      this.unexpected();
  }
}

export function parseBindingList(parent, key, close, bindingListContext = {}) {
  const {allowEmpty} = bindingListContext;
  parent[key] = [];

  this.parseIndentableList(close, bindingListContext, () => {
    let node, token;
    if (allowEmpty && this.eat(tt._pass)) {
      node = null;
      token = this.state.prev;
    } else if (this.match(tt.ellipsis)) {
      node = this.parseRest();
    } else {
      node = this.parseMaybeDefault();
    }
    node = this.parseAssignableListItemTypes(node);
    this.add(parent, key, node, {token});
  });

  return parent;
}

// TODO: move this and parseRest into literals
export function parseSpread(expressionContext) {
  let node = this.startNode();
  this.next();
  this.assign(node, "argument", this.parseExpressionMaybeKeywordOrAssignment(expressionContext));
  return this.finishNode(node, "SpreadElement");
}

export function parseRest(identifierContext = {}) {
  let node = this.startNode();
  this.next();
  this.assign(node, "argument", this.parseIdentifier());
  return this.finishNode(node, "RestElement");
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
    this.assign(node, "left", left);
    this.assign(node, "right", this.parseExpression());
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
  const convertKeywordToken = !(identifierContext.convertKeywordToken === false);
  const isOptional = !!identifierContext.isOptional;

  let node = this.startNode();
  if (this.match(tt.name)) {
    this.checkIdentifierName(identifierContext);
    this.assignRaw(node, "name", this.state.cur.value.value);
  } else if (allowKeywords && this.state.cur.type.keyword) {
    let name = this.state.cur.type.keyword;
    if (convertKeywordToken) this.state.cur.type = tt.name;
    this.assignRaw(node, "name", name);
    // TODO: set this value accordingly
    // this.state.cur.value = {}
  } else if (isOptional) {
    return null;
  } else {
    this.unexpected();
  }

  this.next();
  return this.finishNode(node, "Identifier");
}

export function parseLiteral(value, type) {
  let node = this.startNode();
  this.assignRaw(node, "value", value);
  this.next();
  return this.finishNode(node, type);
}

// override me to implement array comprehensions, etc.
export function parseArrayLiteral(expressionContext) {
  let node = this.startNode();
  this.next();
  node = this.parseExpressionList(node, "elements", tt.bracketR, {...expressionContext, allowEmpty: true, allowTrailingComma: true});
  return this.finishNode(node, "ArrayExpression");
}

// TODO: use for call expressions.
export function parseExpressionList(parent, key, close, expressionContext) {
  const {allowEmpty} = expressionContext;
  parent[key] = [];
  this.parseIndentableList(close, expressionContext, () => {
    let node, token;
    if (allowEmpty && this.eat(tt._pass)) {
      node = null;
      token = this.state.prev;
    } else if (this.match(tt.ellipsis)) {
      node = this.parseSpread(expressionContext);
    } else {
      node = this.parseExpression();
    }
    this.add(parent, key, node, {token});
  });

  return parent;
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
  let node = this.startNode();
  node.properties = [];

  this.next();

  this.parseIndentableList(tt.braceR, {allowTrailingComma: true}, () => {
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
    this.add(node, "properties", prop);
  });

  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression");
}

export function parsePropertyName(prop) {
  if (this.eat(tt.bracketL)) {
    prop.computed = true;
    this.assign(prop, "key", this.parseExpression());
    this.eat(tt.bracketR) || this.unexpected();
  } else {
    prop.computed = false;
    this.assign(prop, "key", (this.match(tt.num) || this.match(tt.string))
      ? this.parseExpressionAtomic()
      : this.parseIdentifier({allowKeywords: true}));
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
    this.assign(prop, "value", isPattern
      ? this.parseMaybeDefault()
      : this.parseExpression(expressionContext));
    prop = this.finishNode(prop, "ObjectProperty");
  } else if (!prop.computed && prop.key.type === "Identifier") {
    prop.kind = "init";
    this.popReference(prop, "key"); // since this is shorthand, only the value will be in sourceElements
    if (isPattern) {
      this.checkShorthandPropertyBinding(prop);
      this.assign(prop, "value", this.parseMaybeDefault(start, prop.key.__clone()));
    } else if (this.match(tt.eq) && expressionContext.shorthandDefaultPos) {
      if (!expressionContext.shorthandDefaultPos.start) {
        expressionContext.shorthandDefaultPos.start = this.state.cur.start;
      }
      this.assign(prop, "value", this.parseMaybeDefault(start, prop.key.__clone()));
    } else {
      this.assign(prop, "value", prop.key.__clone());
    }
    prop.shorthand = true;
    this.addExtra(prop, "shorthand", true);
    prop = this.finishNode(prop, "ObjectProperty");
  } else {
    this.unexpected();
  }
  return prop;
}
