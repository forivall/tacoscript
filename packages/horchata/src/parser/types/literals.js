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
        this.toAssignable(prop.value, isBinding);
      }
      break

    case "ArrayExpression":
      node.type = "ArrayPattern";
      this.toAssignableList(node.elements, isBinding);
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
      node.expression = this.toAssignable(node.expression, isBinding);
      break;

    case "MemberExpression":
      if (!isBinding) break;

    default:
      this.raise(node.start, "Assigning to rvalue");
  }
  return node;
}

export function toArguments(elements) {
  throw new Error("Not Implemented");
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
      throw new Error("Not Implemented");
      // return this.parseObj(true);

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
      // TODO: allow parsing defaults with parseMaybeDefault()
      node = this.parseBindingAtomic();
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
export function parseArrayExpression(expressionContext) {
  let node = this.startNode();
  this.next();
  node.elements = this.parseExpressionList(tt.bracketR, {...expressionContext, allowEmpty: true, allowTrailingComma: true});
  return this.finishNode(node, "ArrayExpression");
}
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
