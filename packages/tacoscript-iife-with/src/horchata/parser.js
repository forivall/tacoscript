// import {tokTypes as tt} from "horchata";

export function extendParseWithExpressionBody(inner, pp) {
  if (inner !== pp.parseWithExpressionBody) {
    throw new Error("parserWithExpressionBody has already been overwritten");
  }
  console.log("extendParseWithExpressionBody")
  return function iife_parseWithExpressionBody(node) {
    this.abort("with iife's are not implemented")
  }
}
