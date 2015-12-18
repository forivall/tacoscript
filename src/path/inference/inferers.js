import * as t from "babel-types";

export { default as Identifier } from "./inferer-reference";

export function VariableDeclarator() {
  let id = this.get("id");

  if (id.isIdentifier()) {
    return this.get("init").getTypeAnnotation();
  } else {
    return;
  }
}

export function TypeCastExpression(node) {
  return node.typeAnnotation;
}

TypeCastExpression.validParent = true;

export function NewExpression(node) {
  if (this.get("callee").isIdentifier()) {
    // only resolve identifier callee
    return t.genericTypeAnnotation(node.callee);
  }
}

export function TemplateLiteral() {
  return t.stringTypeAnnotation();
}

export function UnaryExpression(node) {
  let operator = node.operator;

  if (operator === "void") {
    return t.voidTypeAnnotation();
  } else if (t.NUMBER_UNARY_OPERATORS.indexOf(operator) >= 0) {
    return t.numberTypeAnnotation();
  } else if (t.STRING_UNARY_OPERATORS.indexOf(operator) >= 0) {
    return t.stringTypeAnnotation();
  } else if (t.BOOLEAN_UNARY_OPERATORS.indexOf(operator) >= 0) {
    return t.booleanTypeAnnotation();
  }
}

export function BinaryExpression(node) {
  let operator = node.operator;

  if (t.NUMBER_BINARY_OPERATORS.indexOf(operator) >= 0) {
    return t.numberTypeAnnotation();
  } else if (t.BOOLEAN_BINARY_OPERATORS.indexOf(operator) >= 0) {
    return t.booleanTypeAnnotation();
  } else if (operator === "+") {
    let right = this.get("right");
    let left  = this.get("left");

    if (left.isBaseType("number") && right.isBaseType("number")) {
      // both numbers so this will be a number
      return t.numberTypeAnnotation();
    } else if (left.isBaseType("string") || right.isBaseType("string")) {
      // one is a string so the result will be a string
      return t.stringTypeAnnotation();
    }

    // unsure if left and right are strings or numbers so stay on the safe side
    return t.unionTypeAnnotation([
      t.stringTypeAnnotation(),
      t.numberTypeAnnotation()
    ]);
  }
}

export function LogicalExpression() {
  return t.createUnionTypeAnnotation([
    this.get("left").getTypeAnnotation(),
    this.get("right").getTypeAnnotation()
  ]);
}

export function ConditionalExpression() {
  return t.createUnionTypeAnnotation([
    this.get("consequent").getTypeAnnotation(),
    this.get("alternate").getTypeAnnotation()
  ]);
}

export function SequenceExpression() {
  return this.get("expressions").pop().getTypeAnnotation();
}

export function AssignmentExpression() {
  return this.get("right").getTypeAnnotation();
}

export function UpdateExpression(node) {
  let operator = node.operator;
  if (operator === "++" || operator === "--") {
    return t.numberTypeAnnotation();
  }
}

export function StringLiteral() {
  return t.stringTypeAnnotation();
}

export function NumericLiteral() {
  return t.numberTypeAnnotation();
}

export function BooleanLiteral() {
  return t.booleanTypeAnnotation();
}

export function NullLiteral() {
  return t.nullLiteralTypeAnnotation();
}

export function RegExpLiteral() {
  return t.genericTypeAnnotation(t.identifier("RegExp"));
}

export function ObjectExpression() {
  return t.genericTypeAnnotation(t.identifier("Object"));
}

export function ArrayExpression() {
  return t.genericTypeAnnotation(t.identifier("Array"));
}

export function RestElement() {
  return ArrayExpression();
}

RestElement.validParent = true;

function Func() {
  return t.genericTypeAnnotation(t.identifier("Function"));
}

export { Func as Function, Func as Class };

export function CallExpression() {
  return resolveCall(this.get("callee"));
}

export function TaggedTemplateExpression() {
  return resolveCall(this.get("tag"));
}

function resolveCall(callee) {
  callee = callee.resolve();

  if (callee.isFunction()) {
    if (callee.is("async")) {
      if (callee.is("generator")) {
        return t.genericTypeAnnotation(t.identifier("AsyncIterator"));
      } else {
        return t.genericTypeAnnotation(t.identifier("Promise"));
      }
    } else {
      if (callee.node.returnType) {
        return callee.node.returnType;
      } else {
        // todo: get union type of all return arguments
      }
    }
  }
}
