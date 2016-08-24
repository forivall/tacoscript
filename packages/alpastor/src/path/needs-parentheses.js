// imported from babel-generator aug 14 2016 (a615964)
//
import * as t from "comal-types";

const PRECEDENCE = {
  "||": 0,
  "&&": 1,
  "|": 2,
  "^": 3,
  "&": 4,
  "==": 5,
  "===": 5,
  "!=": 5,
  "!==": 5,
  "<": 6,
  ">": 6,
  "<=": 6,
  ">=": 6,
  in: 6,
  instanceof: 6,
  ">>": 7,
  "<<": 7,
  ">>>": 7,
  "+": 8,
  "-": 8,
  "*": 9,
  "/": 9,
  "%": 9,
  "**": 10
};

export function NullableTypeAnnotation(path: NodePath): boolean {
  return t.isArrayTypeAnnotation(path.parent);
}

export { NullableTypeAnnotation as FunctionTypeAnnotation };

export function UpdateExpression(path: NodePath): boolean {
  const parent = path.parent;
  if (t.isMemberExpression(parent) && parent.object === node) {
    // (foo++).test()
    return true;
  }

  return false;
}

export function ObjectExpression(path: NodePath): boolean {
  return isFirstInStatement(path, {considerArrow: true});
}

export function Binary(path: NodePath): boolean {
  const node = path.node;
  const parent = path.parent;
  if ((t.isCallExpression(parent) || t.isNewExpression(parent)) && parent.callee === node) {
    return true;
  }

  if (t.isUnaryLike(parent)) {
    return true;
  }

  if (t.isMemberExpression(parent) && parent.object === node) {
    return true;
  }

  if (t.isBinary(parent)) {
    let parentOp  = parent.operator;
    let parentPos = PRECEDENCE[parentOp];

    let nodeOp = node.operator;
    let nodePos = PRECEDENCE[nodeOp];

    if (parentPos > nodePos) {
      return true;
    }

    // Logical expressions with the same precedence don't need parens.
    if (parentPos === nodePos && parent.right === node && !t.isLogicalExpression(parent)) {
      return true;
    }
  }

  return false;
}

export function BinaryExpression(path: NodePath): boolean {
  const node = path.node;
  const parent = path.parent;
  if (node.operator === "in") {
    // let i = (1 in []);
    if (t.isVariableDeclarator(parent)) {
      return true;
    }

    // for ((1 in []);;);
    if (t.isFor(parent)) {
      return true;
    }
  }

  return false;
}

export function SequenceExpression(path: NodePath): boolean {
  const node = path.node;
  const parent = path.parent;
  if (t.isForStatement(parent)) {
    // Although parentheses wouldn"t hurt around sequence
    // expressions in the head of for loops, traditional style
    // dictates that e.g. i++, j++ should not be wrapped with
    // parentheses.
    return false;
  }

  if (t.isExpressionStatement(parent) && parent.expression === node) {
    return false;
  }

  if (t.isReturnStatement(parent)) {
    return false;
  }

  if (t.isThrowStatement(parent)) {
    return false;
  }

  if (t.isSwitchStatement(parent) && parent.discriminant === node) {
    return false;
  }

  if (t.isWhileStatement(parent) && parent.test === node) {
    return false;
  }

  if (t.isIfStatement(parent) && parent.test === node) {
    return false;
  }

  if (t.isForInStatement(parent) && parent.right === node) {
    return false;
  }

  // Otherwise err on the side of overparenthesization, adding
  // explicit exceptions above if this proves overzealous.
  return true;
}

export function YieldExpression(path: NodePath): boolean {
  const parent = path.parent;
  return t.isBinary(parent) ||
         t.isUnaryLike(parent) ||
         t.isCallExpression(parent) ||
         t.isMemberExpression(parent) ||
         t.isNewExpression(parent);
}

export { YieldExpression as AwaitExpression };

export function ClassExpression(path: NodePath): boolean {
  return isFirstInStatement(path, {considerDefaultExports: true});
}

export function UnaryLike(path: NodePath): boolean {
  const node = path.node;
  const parent = path.parent;
  if (t.isMemberExpression(parent, { object: node })) {
    return true;
  }

  if (t.isCallExpression(parent, { callee: node }) || t.isNewExpression(parent, { callee: node })) {
    return true;
  }

  return false;
}

export function FunctionExpression(path: NodePath): boolean {
  return isFirstInStatement(path, {considerDefaultExports: true});
}

export function ArrowFunctionExpression(path: NodePath): boolean {
  const parent = path.parent;
  // export default (function () {});
  if (t.isExportDeclaration(parent)) {
    return true;
  }

  if (t.isBinaryExpression(parent) || t.isLogicalExpression(parent)) {
    return true;
  }

  if (t.isUnaryExpression(parent)) {
    return true;
  }

  return UnaryLike(path);
}

export function ConditionalExpression(path: NodePath): boolean {
  const parent = path.parent;
  if (t.isUnaryLike(parent)) {
    return true;
  }

  if (t.isBinary(parent)) {
    return true;
  }

  if (t.isConditionalExpression(parent, { test: path.node })) {
    return true;
  }

  return UnaryLike(path);
}

export function AssignmentExpression(path: NodePath): boolean {
  if (t.isObjectPattern(path.node.left)) {
    return true;
  } else {
    return ConditionalExpression(path);
  }
}

// Walk up the print stack to deterimine if our node can come first
// in statement.
function isFirstInStatement(path: NodePath, {
    considerArrow = false,
    considerDefaultExports = false
  } = {}): boolean {
  while (path != null) {
    const node = path.node;
    const parent = path.parent;
    if (t.isExpressionStatement(parent, { expression: node })) {
      return true;
    }

    if (considerDefaultExports && t.isExportDefaultDeclaration(parent, { declaration: node })) {
      return true;
    }

    if (considerArrow && t.isArrowFunctionExpression(parent, { body: node })) {
      return true;
    }

    if ((t.isCallExpression(parent, { callee: node })) ||
        (t.isSequenceExpression(parent) && parent.expressions[0] === node) ||
        (t.isMemberExpression(parent, { object: node })) ||
        (t.isConditional(parent, { test: node })) ||
        (t.isBinary(parent, { left: node })) ||
        (t.isAssignmentExpression(parent, { left: node }))) {
      path = path.parentPath;
    } else {
      return false;
    }
  }

  return false;
}
