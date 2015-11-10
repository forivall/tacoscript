// "atomics" and types.
// TOOD: rename "types" in generator to "literals"

// this file is roughly equivalent to lval from acorn and babylon
// and also contains content from expression in acorn/babel
// Ident(ifier), Templates, Obj literal, Obj binding, properties, array literals & bindings

// this differs from acorn and babylon in that this function checks the token's
// type so that custom lval patterns can be invented. If someone wants to do
// that. >_<

import { types as tt } from "../../tokenizer/types";

export function toAssignable(node, tokType) {
  if (tokType === tt.eq) {
    throw new Error("Not Implemented");
  }
  return node;
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
      let node = this.startNode()
      this.next()
      node.elements = this.parseBindingList(tt.bracketR, true, true)
      return this.finishNode(node, "ArrayPattern")

    case tt.braceL:
      return this.parseObj(true)

    default:
      this.unexpected()
  }
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
