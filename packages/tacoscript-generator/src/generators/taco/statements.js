/* @flow */

import * as t from "babel-types";

export function WithStatement(node) {
  this.keyword("with");
  this.print(node, "object");
  this.printBlock(node);
}

export function IfStatement(node) {
  this.keyword("if");
  this.print(node.test, node);

  this.printBlock(node, "consequent");

  if (node.alternate) {
    this.keyword("else");
    this.printBlock(node, "alternate");
  }
}

export function ForStatement(node) {
  this.keyword("for");

  this.print(node, "init");

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
    this.push(op);
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
}

// TODO: if syntax is ambiguous, use a !
function buildLabelStatement(prefix, key = "label") {
  return function (node) {
    this.push(prefix);

    if (node[key]) {
      this.print(node, key);
    }
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

  this.print(node, "handler");

  if (node.finalizer) {
    this.keyword("finally");
    this.print(node, "finalizer");
  }
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
  this.print(node.discriminant, node);

  this.printStatements(node.cases, node, {
    indent: true
  });
}

export function _switchCase(node) {
  if (node.test) {
    this.keyword("case");
    this.print(node.test, node);
    this.push(":");
  } else {
    this.keyword("default");
    this.push(":");
  }
}

export function SwitchCase(node) {
  this._switchCase(node);
  if (node.consequent.length) {
    this.printStatements(node, "consequent", { indent: true });
  }
}

export function SafeSwitchCase(node: Object) {
  if (node.fallthrough) {
    this.keyword("and");
  }
  this._switchCase(node);
  this.printBlock(node);
}

export function DebuggerStatement() {
  this.keyword("debugger");
}

export function VariableDeclaration(node: Object, parent: Object) {
  this.keyword(node.kind);

  let hasInits = false;
  // don't add whitespace to loop heads
  if (!t.isFor(parent)) {
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
    let sep = ",";
    if (!this.format.compact && hasInits) {
      sep = [{type: "newline"}, {type: "indent"}];
    }

    this.printList(node.declarations, node, { separator: sep });
  }
}

export function VariableDeclarator(node: Object) {
  this.print(node, "id", {assertChildrenPrinted: ["typeAnnotation"]});
  if (node.init) {
    this.push("=");
    this.print(node, "init");
  }
}
