import {tokTypes as tt} from "horchata";

export function extendParseWithExpressionBody(inner, pp) {
  if (inner !== pp.parseWithExpressionBody) {
    throw new Error("parserWithExpressionBody has already been overwritten");
  }
  return function iife_parseWithExpressionBody(node) {
    node.generator = false;
    node.async = false;
    node.arrow = false;
    let implicitReturn = false;

    while (!this.match(tt.braceL)) {
      // parse *, +, and = flags
      // TODO: extend the lexer so that *= and += aren't tokenized as tt.eq
      if (this.match(tt.star) && !node.generator) {
        node.generator = true;
        this.assignToken(node, "generator", "*");
        this.next();
      } else if (this.match(tt.iifeAsyncFlag) && !node.async) {
        node.async = true;
        this.assignToken(node, "async", "+");
        this.next();
      } else if (this.match(tt.iifeBindFlag) && !node.arrow) {
        node.arrow = true;
        this.assignToken(node, "arrow", "=");
        this.next();
      } else this.unexpected();
    }

    this.assign(node, "binding", this.parseObjectBinding());

    if (this.match(tt.relational) && this.state.cur.value === ">") {
      implicitReturn = true;
      this.next();
    }

    node = this.parseFunctionBody(node, {allowConcise: true, implicitReturn});
    if (implicitReturn) node = this.maybeTransformArrowFunctionBody(node);
    return this.finishNode(node, "ImmediatelyInvokedFunctionExpression");
  }
}

// TODO
// export function extendCheckFunctionAssignable(inner) {
//   return function(node, setStrict) {
//
//   }
// }
