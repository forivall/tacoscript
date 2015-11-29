/* @flow */

import * as t from "babel-types";

export function WithStatement(node) {
  this.keyword("with");
  this.print(node, "object");
  this.printBlock(node);
}

export function IfStatement(node) {
  this.keyword("if");
  this.print(node, "test");

  this.printBlock(node, "consequent");
  if (node.alternate) {
    this.keyword("else");
    this.printBlock(node, "alternate");
  }
}

export function ForStatement(node) {
  this.keyword("for");

  if (node.init) this.print(node, "init");

  if (node.test) {
    this.keyword("while");
    this.print(node, "test");
  }

  if (node.update) {
    this.keyword("update");
    this.print(node, "update");
  }

  this.printBlock(node);
}
// TODO: forUptoStatement
// TODO: forDowntoStatement

export function WhileStatement(node) {
  this.keyword("while");
  this.print(node, "test");
  this.printBlock(node);
}

let buildForXStatement = function (op) {
  return function (node) {
    this.keyword("for");
    this.print(node, "left");
    this.keyword(op);
    this.print(node, "right");
    this.printBlock(node);
  };
};

export let ForInStatement = buildForXStatement("in");
export let ForOfStatement = buildForXStatement("of");

export function DoWhileStatement(node) {
  this.push("do");
  this.printBlock(node);
  this.keyword("while");
  this.print(node, "test");
  this.newline();
}

// TODO: if syntax is ambiguous, use a !
function buildLabelStatement(prefix, key = "label") {
  return function (node) {
    this.push(prefix);

    if (node[key]) {
      this.print(node, key);
    }
    this.newline();
  };
}

export let ContinueStatement = buildLabelStatement("continue");
export let ReturnStatement   = buildLabelStatement("return", "argument");
export let BreakStatement    = buildLabelStatement("break");
export let ThrowStatement    = buildLabelStatement("throw", "argument");

export function LabeledStatement(node) {
  this.print(node, "label");
  this.push(":");
  this.print(node, "body");
}

export function TryStatement(node) {
  this.keyword("try");
  this.printBlock(node, "block");

  if (node.handler) this.print(node, "handler");

  if (node.finalizer) {
    this.keyword("finally");
    this.printBlock(node, "finalizer");
  }
  if (!this.format.preserve) this.newline(true);
}

export function CatchClause(node) {
  this.keyword("catch");
  this.print(node, "param");
  this.printBlock(node);
}

// TODO: SafeSwitchStatement
export function SwitchStatement(node) {
  this.keyword("switch");
  this.push("!");
  this.print(node, "discriminant");
  this.newline();

  this.printStatements(node, "cases", {
    indent: true
  });

  if (!this.format.preserve) this.newline(true);
}

export function _switchCase(node) {
  if (node.test) {
    this.keyword("case");
    this.print(node, "test");
    this.push(":");
  } else {
    this.keyword("default");
    this.push(":");
  }
}

export function SwitchCase(node) {
  this._switchCase(node);
  if (node.consequent.length) {
    this.newline();
    this.printStatements(node, "consequent", { indent: true });
  }
  this.newline();
}

export function SafeSwitchCase(node) {
  if (node.fallthrough) {
    this.keyword("and");
  }
  this._switchCase(node);
  // NOTE: this can't be a block, for scope reasons.
  // if collapse, if the array only contains one statement, it will be prefixed
  // with "then" and will have no leading newline.
  this.printStatements(node, "consequent", { indent: true, collapse: true });
}

export function DebuggerStatement() {
  this.keyword("debugger");
  this.newline();
}

export function VariableDeclaration(node, parent) {
  this.keyword(node.kind);

  let hasInits = false;
  // don't add whitespace to loop heads
  let isLoopHead = t.isFor(parent);
  if (!isLoopHead) {
    for (let declar of (node.declarations: Array<Object>)) {
      if (declar.init) {
        // has an init so let's split it up over multiple lines
        hasInits = true;
      }
    }
  }
  if (this.format.preserve && node.tokenElements && node.tokenElements.length) {
    throw new Error("Not Implemented");
  } else {
    let useNewlines = !this.format.compact && hasInits && node.declarations.length > 1;
    let sep = useNewlines ? {type: "newline"} : ",";
    if (useNewlines) this.newline();
    this.printMultiple(node, "declarations", { separator: sep, indent: useNewlines });
    if (!isLoopHead) this.newline();
  }
}

export function VariableDeclarator(node) {
  this.print(node, "id", {assertChildrenPrinted: ["typeAnnotation"]});
  if (node.init) {
    this.push("=");
    this.print(node, "init");
  }
}
