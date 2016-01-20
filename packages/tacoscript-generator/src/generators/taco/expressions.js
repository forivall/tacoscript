
import isInteger from "is-integer";
import isNumber from "lodash/lang/isNumber";
import clone from "lodash/lang/clone";
import * as t from "babel-types";
import {Token} from "horchata";

const SCIENTIFIC_NOTATION = /e/i;

export function UnaryExpression(node) {
  // operator can be any token type that has prefix: true
  // TODO: generic node lookup
  var s = clone(Token.stateFromCode(node.operator === "!" ? "not" : node.operator));
  s.meta = {unary: true};
  this.push(s);
  this.print(node, "argument");
}

export function DoExpression(node) {
  this.push("do");
  this.printBlock(node);
}

export function ParenthesizedExpression(node) {
  this.push("(");
  this.print(node, "expression");
  this.push(")");
}

export function UpdateExpression(node) {
  if (node.prefix) {
    this.push(node.operator);
    this.print(node, "argument");
  } else {
    this.print(node, "argument");
    this.push(node.operator);
  }
}

// TODO: ToggleExpression - see frappe "nice alternative to nested ternaries"

export function ConditionalExpression(node) {
  this.push("if");
  // TODO: or if parent is an expression
  if (!node.parenthesizedExpression) this.push("!");
  this.print(node, "test");
  this.push("then");
  this.print(node, "consequent");
  this.push("else");
  this.print(node, "alternate");

}

export function NewExpression(node) {
  this.push("new");
  this.print(node, "callee");
  if (!node.emptyArguments || node.arguments.length) this.printArguments(node);
}

export function SequenceExpression(node) {
  this.printMultiple(node, "expressions", {separator: ";"});
}

export function ThisExpression() {
  this.push("this");
}

export function Super() {
  this.push("super");
}

export function Decorator(node) {
  this.push("@");
  this.print(node, "expression");
  this.lineTerminator();
}

export function CallExpression(node) {
  this.print(node, "callee");
  if (this.format.preserveLines && node.arguments[0]) this.catchUp(node.arguments[0], node);
  this.printArguments(node);
}

export function YieldExpression(node) {
  this.push("yield");

  if (node.delegate) {
    this.push("*");
  }

  if (node.argument) {
    this.print(node, "argument");
  }
}

export function AwaitExpression(node) {
  this.push("await");

  if (node.argument) {
    this.print(node, "argument");
  }
}

export function EmptyStatement() {
  this.push("pass");
  this.lineTerminator();
}

export function ExpressionStatement(node) {
  this.print(node, "expression");
  this.lineTerminator();
}

export function AssignmentPattern(node) {
  this.print(node, "left");
  this.push("=");
  this.print(node, "right");
}

export function AssignmentExpression(node) {
  this.print(node, "left");
  // can be any token that has {isAssign: true}
  this.push(node.operator);
  this.print(node, "right");
}

export function BinaryExpression(node) {
  // ensure valid
  if (t.isFunctionExpression(node.left) && node.left.body.body.length === 0) {
    let extra = node.left.extra == null ? node.left.extra = {} : node.left.extra;
    if (extra && !extra.parenthesized) {
      extra.parenthesized = true;
      extra.autoParens = true;
    }
  }
  // all other binary operators
  this.print(node, "left");
  let operator = node.operator;
  if (!this.dialect["equality-symbols"]) {
    switch (operator) {
      case "===": operator = "is"; break;
      case "!==": operator = "isnt"; break;
      case "==": operator = "like"; break;
      case "!=": operator = "unlike"; break;
    }
  }
  this.push(operator);
  this.print(node, "right");
}

export function LogicalExpression(node) {
  // ensure valid
  if (t.isFunctionExpression(node.left) && node.left.body.body.length === 0) {
    let extra = node.left.extra == null ? node.left.extra = {} : node.left.extra;
    if (extra && !extra.parenthesized) {
      extra.parenthesized = true;
      extra.autoParens = true;
    }
  }
  this.print(node, "left");
  this.push(node.operator == "||" ? "or" : "and");
  this.print(node, "right");
}

export function BindExpression(node) {
  if (node.object != null) this.print(node, "object");
  this.push("::");
  this.print(node, "callee");
}

export function MemberExpression(node) {
  this.print(node, "object");

  if (!node.computed && t.isMemberExpression(node.property)) {
    throw new TypeError("Got a MemberExpression for MemberExpression property");
  }

  let computed = node.computed;
  if (t.isLiteral(node.property) && isNumber(node.property.value)) {
    computed = true;
  }

  if (computed) {
    this.push("[");
    this.print(node, "property");
    this.push("]");
  } else {
    if (t.isLiteral(node.object)) {
      // TODO: preserve original format
      let val = this._stringLiteral(node.object);
      if (isInteger(+val) && !SCIENTIFIC_NOTATION.test(val) && !this.endsWith(".")) {
        this.push(".");
      }
    }

    this.push(".");
    this.print(node, "property");
  }
}

// like `new.target`
export function MetaProperty(node) {
  this.print(node, "meta");
  this.push(".");
  this.print(node, "property");
}

// TODO: SoakExpression
// TODO: NullCoalesceExpression
