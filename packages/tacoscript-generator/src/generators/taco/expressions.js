
import isInteger from "is-integer";
import isNumber from "lodash/lang/isNumber";
import * as t from "babel-types";
import {TacoToken as Token} from "horchata/lib/tokenizer";

const SCIENTIFIC_NOTATION = /e/i;

export function UnaryExpression(node) {
  // TODO: move this check into token serialization
  // let needsSpace = /[a-z]$/.test(node.operator);
  // let arg = node.argument;
  // if (t.isUpdateExpression(arg) || t.isUnaryExpression(arg)) {
  //   needsSpace = true;
  // }
  //
  // if (t.isUnaryExpression(arg) && arg.operator === "!") {
  //   needsSpace = false;
  // }

  // operator can be any token type that has prefix: true
  // TODO: generic node lookup
  var s = Token.stateFromCode(node.operator === "!" ? "not" : node.operator);
  s.meta = { unary: true };
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
  this.push("if", "!");
  this.print(node, "test");
  this.push("then");
  this.print(node, "consequent");
  this.push("else");
  this.print(node, "alternate");
}

export function NewExpression(node) {
  if (node.parenthesizedExpression) this.push("(");
  this.push("new");
  this.print(node, "callee");
  if (!node.emptyArguments || node.arguments.length) this.printArguments(node);
  if (node.parenthesizedExpression) this.push(")");
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
  this.newline();
}

export function CallExpression(node) {
  this.print(node, "callee");
  this.printArguments(node);
}

function buildYieldAwait(keyword) {
  return function (node) {
    this.push(keyword);

    if (node.delegate || node.all) {
      this.push("*");
    }

    if (node.argument) {
      this.print(node, "argument");
    }
  };
}

export let YieldExpression = buildYieldAwait("yield");
export let AwaitExpression = buildYieldAwait("await");

export function EmptyStatement() {
  this.push("pass");
  this.newline();
}

export function ExpressionStatement(node) {
  this.print(node, "expression");
  this.newline();
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
  // all other binary operators
  if (node.parenthesizedExpression) this.push("(");
  this.print(node, "left");
  let operator = node.operator;
  if (this.format.equals === "words") {
    operator = ({
      "===": "is",
      "!==": "isnt",
      "==": "like",
      "!=": "unlike"
    })[operator];
  }
  this.push(operator);
  this.print(node, "right");
  if (node.parenthesizedExpression) this.push(")")
}

export function LogicalExpression(node) {
  this.print(node, "left");
  this.push(node.operator == "||" ? "or" : "and");
  this.print(node, "right");
}

export function BindExpression(node) {
  this.print(node, "object");
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
