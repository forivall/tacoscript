import * as parens from "./needs-parentheses";
import * as t from "comal-types";

// TODO: move this into comal-types
function expandAliases(obj) {
  let newObj = {};

  function add(type, func) {
    let fn = newObj[type];
    newObj[type] = fn ? function(node, parent, stack) {
      let result = fn(node, parent, stack);

      return result == null ? func(node, parent, stack) : result;
    } : func;
  }

  for (let type of Object.keys(obj)) {

    let aliases = t.FLIPPED_ALIAS_KEYS[type];
    if (aliases) {
      for (let alias of aliases) {
        add(alias, obj[type]);
      }
    } else {
      add(type, obj[type]);
    }
  }

  return newObj;
}

// Rather than using `t.is` on each object property, we pre-expand any type aliases
// into concrete types so that the 'find' call below can be as fast as possible.
let expandedParens = expandAliases(parens);

function find(obj, node, parent, printStack) {
  let fn = obj[node.type];
  return fn ? fn(node, parent, printStack) : null;
}

function isOrHasCallExpression(node) {
  if (t.isCallExpression(node)) {
    return true;
  }

  if (t.isMemberExpression(node)) {
    return isOrHasCallExpression(node.object) ||
      (!node.computed && isOrHasCallExpression(node.property));
  } else {
    return false;
  }
}

// TODO: import needsWhitespace

export function needsParens(path) {
  const parent = path.parent;
  const node = path.node;
  if (!parent) return false;

  if (t.isNewExpression(parent) && parent.callee === node) {
    if (isOrHasCallExpression(node)) return true;
  }

  return find(expandedParens, path);
}
