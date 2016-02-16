import {tokTypes as tt} from "horchata";

// if there's a need to have (! a, b) without an arrow, then use this as an intermediate
// between finishParseParenAndDistinguishExpression and parseInvokedFunctionExpression
// export function parseParenExclAndDistinguishExpression(node, expressionContext) {
// }

export function parseInvokedFunctionExpression(/*node, expressionContext*/) {
  this.abort("!-style IIFE Not Implemented");
}

export function extendFinishParseParenAndDistinguishExpression(inner) {
  return function iife_finishParseParenAndDistinguishExpression(node, expressionContext) {
    if (this.match(tt.excl)) {
      return this.parseInvokedFunctionExpression(node, expressionContext);
    }
    return inner.call(this, node, expressionContext);
  }
}
