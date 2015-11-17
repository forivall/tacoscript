/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

// The algorithm used to determine whether a regexp can appear at a
// given point in the program is loosely based on sweet.js' approach.
// See https://github.com/mozilla/sweet.js/wiki/design

import Lexer from "./index";
import State from "./state";
import {types as tt} from "./types";

export class TokContext {
  constructor(token, isExpr, preserveSpace, override) {
    this.token = token;
    this.isExpr = !!isExpr;
    this.preserveSpace = !!preserveSpace;
    this.override = override;
  }
}

// TODO: document context types and reason(s) for needing a new context for each
export const types = {
  i_stat: new TokContext("indent", false),
  decl_expr: new TokContext("var", true),
  return_expr: new TokContext("return", true),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", true),
  kw_stat: new TokContext("keyword", false), // implicit parenthises for keyword block starters
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, p => p.readTmplToken()),
  f_expr: new TokContext("function", true),
  // for a list of expressions
  // * arguments for a function definition
  // * arguments for a function call
  // * continuation of a if/for/while statement
  // l_expr: new TokContext("list", true),
  // *** for now, require use of escaped newlines, like python
}

const sp = State.prototype;

sp.initialContext = function() {
  return [types.i_stat];
};

const lp = Lexer.prototype;

lp.updateContext = function(prevType) {
  let update, type = this.state.cur.type;
  if (type.keyword && prevType == tt.dot) {
    this.state.exprAllowed = false;
  } else if (update = type.updateContext) {
    update.call(this, prevType);
  } else {
    this.state.exprAllowed = type.beforeExpr;
  }
};

lp.curContext = function() {
  return this.state.context[this.state.context.length - 1];
};

// Token-specific context update code

tt.indent.updateContext = function(prevType) {
  // we need to check if the indent introduces a block, or continues a
  // * call expression's arguments
  // * function declaration/expression's arguments
  // * array
  // * object
  // * statement header (like the conditional in an if or for, etc.)
  if (prevType === tt._let || prevType === tt._const || prevType === tt._var) {
    this.state.context.push(types.decl_expr);
  // } else if (prevType === tt.indent) {
  //   // double indent for keyword head
  //   this.state.context.push(types.kw_stat);
  } else if (prevType === tt._return) {
    this.state.context.push(types.return_expr);
  } else {
    if (this.curContext() === types.kw_stat) {
      this.state.context.pop();
    }
    this.state.exprAllowed = false;
    this.state.context.push(types.i_stat);
  }
};

tt._then.updateContext = function() {
  if (this.curContext() === types.kw_stat) {
    this.state.context.pop();
  }
  this.state.exprAllowed = true;
}

tt.braceL.updateContext = function() {
  this.state.context.push(types.b_expr);
  this.state.exprAllowed = true;
};

tt.dollarBraceL.updateContext = function() {
  this.state.context.push(types.b_tmpl);
  this.state.exprAllowed = true;
};

let blockStatementUpdateContext = function() {
  // TODO: don't push kw_stat for `if` when it's an implicit conditional
  this.state.context.push(types.kw_stat);
  this.state.exprAllowed = true;
};
tt._if.updateContext = tt._for.updateContext = tt._with.updateContext = blockStatementUpdateContext;

tt._while.updateContext = function() {
  throw new Error("Not Implemented");
  if (this.state.inForHeader) return;
  this.state.context.push(types.kw_stat);
  this.state.exprAllowed = true;
};

tt.excl.updateContext = function(prevType) {
  if (prevType === tt._if) {
    this.state.context.pop();
  }
}

// TODO: do we need to detect if this is a list of parameters
tt.parenL.updateContext = function() {
  this.state.context.push(types.p_expr);
  this.state.exprAllowed = true;
};

tt.incDec.updateContext = function() {
  // keep `this.state.exprAllowed` unchanged
};

tt._function.updateContext = function() {
  if (this.curContext() !== types.i_stat) {
    this.state.context.push(types.f_expr);
  }
  this.exprAllowed = false;
};

tt.backQuote.updateContext = function() {
  if (this.curContext() === types.q_tmpl) {
    this.state.context.pop();
  } else {
    this.state.context.push(types.q_tmpl);
  }
  this.exprAllowed = false;
};


tt.braceR.updateContext = function() {
  if (this.state.context.length === 1) {
    this.state.exprAllowed = true;
    return;
  }
  let out = this.state.context.pop();
  if (out === types.b_tmpl) {
    this.state.exprAllowed = true;
  } else {
    this.state.exprAllowed = !out.isExpr;
  }
};

tt.parenR.updateContext = function() {
  if (this.state.context.length === 1) {
    this.state.exprAllowed = true;
    return;
  }
  let out = this.state.context.pop();
  this.state.exprAllowed = false;
};

tt.dedent.updateContext = function() {
  if (this.state.context.length === 1) {
    this.state.exprAllowed = true;
    return;
  }
  let out = this.state.context.pop();
  if (out === types.i_stat && (this.curContext() === types.f_expr)) {
    this.state.context.pop();
    this.state.exprAllowed = false;
  } else {
    this.state.exprAllowed = !out.isExpr;
  }
};
