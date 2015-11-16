import type NodePath from "./index";

// This file contains Babels metainterpreter that can evaluate static code.

/* eslint eqeqeq: 0 */

const VALID_CALLEES = ["String", "Number", "Math"];
const INVALID_METHODS = ["random"];

/**
 * Walk the input `node` and statically evaluate if it's truthy.
 *
 * Returning `true` when we're sure that the expression will evaluate to a
 * truthy value, `false` if we're sure that it will evaluate to a falsy
 * value and `undefined` if we aren't sure. Because of this please do not
 * rely on coercion when using this method and check with === if it's false.
 *
 * For example do:
 *
 *   if (t.evaluateTruthy(node) === false) falsyLogic();
 *
 * **AND NOT**
 *
 *   if (!t.evaluateTruthy(node)) falsyLogic();
 *
 */

export function evaluateTruthy(): boolean {
  let res = this.evaluate();
  if (res.confident) return !!res.value;
}

/**
 * Walk the input `node` and statically evaluate it.
 *
 * Returns an object in the form `{ confident, value }`. `confident` indicates
 * whether or not we had to drop out of evaluating the expression because of
 * hitting an unknown node that we couldn't confidently find the value of.
 *
 * Example:
 *
 *   t.evaluate(parse("5 + 5")) // { confident: true, value: 10 }
 *   t.evaluate(parse("!true")) // { confident: true, value: false }
 *   t.evaluate(parse("foo + foo")) // { confident: false, value: undefined }
 *
 */

export function evaluate(): { confident: boolean; value: any } {
  let confident = true;
  let deoptPath: ?NodePath;

  function deopt(path) {
    if (!confident) return;
    deoptPath = path;
    confident = false;
  }

  let value = evaluate(this);
  if (!confident) value = undefined;
  return {
    confident: confident,
    deopt:     deoptPath,
    value:     value
  };

  function evaluate(path) {
    if (!confident) return;

    let { node } = path;

    if (path.isSequenceExpression()) {
      let exprs = path.get("expressions");
      return evaluate(exprs[exprs.length - 1]);
    }

    if (path.isStringLiteral() || path.isNumericLiteral() || path.isBooleanLiteral()) {
      return node.value;
    }

    if (path.isNullLiteral()) {
      return null;
    }

    if (path.isTemplateLiteral()) {
      let str = "";

      let i = 0;
      let exprs = path.get("expressions");

      for (let elem of (node.quasis: Array<Object>)) {
        // not confident, evaluated an expression we don't like
        if (!confident) break;

        // add on cooked element
        str += elem.value.cooked;

        // add on interpolated expression if it's present
        let expr = exprs[i++];
        if (expr) str += String(evaluate(expr));
      }

      if (confident) return str;
    }

    if (path.isConditionalExpression()) {
      if (evaluate(path.get("test"))) {
        return evaluate(path.get("consequent"));
      } else {
        return evaluate(path.get("alternate"));
      }
    }

    if (path.isExpressionWrapper()) { // TypeCastExpression, ExpressionStatement etc
      return evaluate(path.get("expression"));
    }

    // "foo".length
    if (path.isMemberExpression() && !path.parentPath.isCallExpression({ callee: node })) {
      let property = path.get("property");
      let object = path.get("object");

      if (object.isLiteral() && property.isIdentifier()) {
        let value = object.node.value;
        let type = typeof value;
        if (type === "number" || type === "string") {
          return value[property.node.name];
        }
      }
    }

    if (path.isReferencedIdentifier()) {
      let binding = path.scope.getBinding(node.name);
      if (binding && binding.hasValue) {
        return binding.value;
      } else {
        if (node.name === "undefined") {
          return undefined;
        } else if (node.name === "Infinity") {
          return Infinity;
        } else if (node.name === "NaN") {
          return NaN;
        }

        let resolved = path.resolve();
        if (resolved === path) {
          return deopt(path);
        } else {
          return evaluate(resolved);
        }
      }
    }

    if (path.isUnaryExpression({ prefix: true })) {
      if (node.operator === "void") {
        // we don't need to evaluate the argument to know what this will return
        return undefined;
      }

      let argument = path.get("argument");
      if (node.operator === "typeof" && (argument.isFunction() || argument.isClass())) {
        return "function";
      }

      let arg = evaluate(argument);
      switch (node.operator) {
        case "!": return !arg;
        case "+": return +arg;
        case "-": return -arg;
        case "~": return ~arg;
        case "typeof": return typeof arg;
      }
    }

    if (path.isArrayExpression()) {
      let arr = [];
      let elems: Array<NodePath> = path.get("elements");
      for (let elem of elems) {
        elem = elem.evaluate();

        if (elem.confident) {
          arr.push(elem.value);
        } else {
          return deopt(elem);
        }
      }
      return arr;
    }

    if (path.isObjectExpression()) {
      // todo
    }

    if (path.isLogicalExpression()) {
      // If we are confident that one side of an && is false, or one side of
      // an || is true, we can be confident about the entire expression
      let wasConfident = confident;
      let left = evaluate(path.get("left"));
      let leftConfident = confident;
      confident = wasConfident;
      let right = evaluate(path.get("right"));
      let rightConfident = confident;
      let uncertain = leftConfident !== rightConfident;
      confident = leftConfident && rightConfident;

      switch (node.operator) {
        case "||":
          if ((left || right) && uncertain) {
            confident = true;
          }
          return left || right;
        case "&&":
          if ((!left && leftConfident) || (!right && rightConfident)) {
            confident = true;
          }
          return left && right;
      }
    }

    if (path.isBinaryExpression()) {
      let left = evaluate(path.get("left"));
      let right = evaluate(path.get("right"));

      switch (node.operator) {
        case "-": return left - right;
        case "+": return left + right;
        case "/": return left / right;
        case "*": return left * right;
        case "%": return left % right;
        case "**": return left ** right;
        case "<": return left < right;
        case ">": return left > right;
        case "<=": return left <= right;
        case ">=": return left >= right;
        case "==": return left == right;
        case "!=": return left != right;
        case "===": return left === right;
        case "!==": return left !== right;
        case "|": return left | right;
        case "&": return left & right;
        case "^": return left ^ right;
        case "<<": return left << right;
        case ">>": return left >> right;
        case ">>>": return left >>> right;
      }
    }

    if (path.isCallExpression()) {
      let callee = path.get("callee");
      let context;
      let func;

      // Number(1);
      if (callee.isIdentifier() && !path.scope.getBinding(callee.node.name, true) && VALID_CALLEES.indexOf(callee.node.name) >= 0) {
        func = global[node.callee.name];
      }

      if (callee.isMemberExpression()) {
        let object = callee.get("object");
        let property = callee.get("property");

        // Math.min(1, 2)
        if (object.isIdentifier() && property.isIdentifier() && VALID_CALLEES.indexOf(object.node.name) >= 0 && INVALID_METHODS.indexOf(property.node.name) < 0) {
          context = global[object.node.name];
          func = context[property.node.name];
        }

        // "abc".charCodeAt(4)
        if (object.isLiteral() && property.isIdentifier()) {
          let type = typeof object.node.value;
          if (type === "string" || type === "number") {
            context = object.node.value;
            func = context[property.node.name];
          }
        }
      }

      if (func) {
        let args = path.get("arguments").map(evaluate);
        if (!confident) return;

        return func.apply(context, args);
      }
    }

    deopt(path);
  }
}
