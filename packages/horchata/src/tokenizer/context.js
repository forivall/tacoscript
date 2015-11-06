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
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", true),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, p => p.readTmplToken()),
  f_expr: new TokContext("function", true),
  kw_stat: new TokContext("keyword", true),
}

const sp = State.prototype;

sp.initialContext = function() {
  return [types.i_stat];
}

const lp = Lexer.prototype;

lp.updateContext = function(prevType) {
  let update, type = this.type;
  if (type.keyword && prevType == tt.dot) {
    this.state.exprAllowed = false;
  } else if (update = type.updateContext) {
    update.call(this, prevType);
  } else {
    this.state.exprAllowed = type.beforeExpr;
  }
}

// Token-specific context update code

tt.parenR.updateContext = tt.braceR.updateContext = tt.dedent = function() {
  if (this.state.context.length === 1) {
    this.state.exprAllowed = true;
    return;
  }
  let out = this.state.context.pop();
  if (out === types.i_stat && this.curContext() === types.f_expr) {
    this.state.context.pop();
    this.state.exprAllowed = false;
  } else if (out === types.b_tmpl) {
    this.state.exprAllowed = true;
  } else {
    this.state.exprAllowed = !out.isExpr;
  }
}

// TODO
tt.newline.updateContext = function() {
  throw new Error("Not Implmented");
}

tt._then.updateContext = function() {
  throw new Error("Not Implemented");
}

tt.indent.updateContext = function() {
  throw new Error("Not Implemented");
}

tt.braceL.updateContext = function() {
  this.state.context.push(types.b_expr);
  this.state.exprAllowed = true;
}

tt.dollarBraceL.updateContext = function() {
  this.state.context.push(types.b_tmpl);
  this.state.exprAllowed = true;
}

tt._if.updateContext = tt._for.updateContext = tt._with.updateContext = function() {
  this.state.context.push(types.kw_stat);
  this.state.exprAllowed = true;
}

tt._while.updateContext = function() {
  if (this.state.inForHeader) return;
  this.state.context.push(types.kw_stat);
  this.state.exprAllowed = true;
}

// TODO: do we need to detect if this is a list of parameters
tt.parenL.updateContext = function() {
  this.state.context.push(types.p_expr);
  this.state.exprAllowed = true;
}

tt.incDec.updateContext = function() {
  // keep `this.state.exprAllowed` unchanged
}

tt._function.updateContext = function() {
  if (this.curContext() !== types.b_stat) {
    this.context.push(types.f_expr);
  }
  this.exprAllowed = false;
}

tt.backQuote.updateContext = function() {
  if (this.curContext() === types.q_tmpl) {
    this.context.pop();
  } else {
    this.context.push(types.q_tmpl);
  }
  this.exprAllowed = false;
}
