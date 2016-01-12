
const commonPrinterMethods = {
  generate() {
    this.tokenize();
    let code = this.stringify();

    return {
      code: code,
      tokens: this.tokens,
      map: this.getMap()
    }
  },

  getMap() {
    let map = this.map;
    return map ? map.toJSON() : map;
  },

  // Comments printing methods. "borrowed" from babel-generator

  getComments(key, node) {
    return (node && node[key]) || [];
  },

  printComments(comments, attachedNode) {
    if (!comments || !comments.length) return;

    for (let comment of (comments: Array)) {
      // language-specific printers should implement printComment
      this.printComment(comment);
    }
  },

  printInnerComments(node, indent = true) {
    if (!node.innerComments) return;
    if (indent) this.indent();
    this.printComments(node.innerComments);
    if (indent) this.dedent();
  },

  shouldPrintComment(comment) {
    return true;
    // if (this.format.shouldPrintComment) {
    //   return this.format.shouldPrintComment(comment.value);
    // } else {
    //   if (comment.value.indexOf("@license") >= 0 || comment.value.indexOf("@preserve") >= 0) {
    //     return true;
    //   } else {
    //     return this.format.comments;
    //   }
    // }
  },

};
export default commonPrinterMethods;

// TODO: submit babel bug?
commonPrinterMethods["default"] = commonPrinterMethods;

import * as _base from "./generators/base";
// import * as _jsx from "./generators/jsx";
// import * as _flow from "./generators/flow";
// import * as _modules from "./generators/modules";
// import * as _templateLiterals from "./generators/templateLiterals";
// NOTE: these are only the types with shared syntax. Arrays literals, object
// literals, and possibly regex types will have minor differences
// import * as _types from "./generators/simpleTypes";

for (let generator of [_base/*, _types*/]) {
  Object.assign(commonPrinterMethods, generator);
}
