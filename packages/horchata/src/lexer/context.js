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

import {TokContext, types} from "./context-types";
export {TokContext, types};

const sp = State.prototype;

sp.initialContext = function() {
  return [types.stmt];
};

const lp = Lexer.prototype;

// called in `finishToken()`
lp.updateContext = function updateContext(type, prevType) {
  let update;
  if (type.keyword && prevType == tt.dot) {
    // meta property
    this.state.exprAllowed = false;
  } else if (update = type.updateContext) {
    update.call(this, type, prevType);
  } else {
    this.state.exprAllowed = type.beforeExpr;
  }
};

lp.curContext = function() {
  return this.state.context[this.state.context.length - 1];
};

// Token-specific context update code

tt.indent.updateContext = function(type, prevType) {
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
  //   this.state.context.push(types.stmt_head);
  } else if (prevType === tt._return) {
    this.state.context.push(types.return_expr);
  } else {
    if (this.curContext() === types.stmt_head) {
      this.state.inForHeaderInit = false;
      this.state.context.pop();
    }
    this.state.exprAllowed = false;
    this.state.context.push(types.stmt);
  }
};

tt._then.updateContext = function(type) {
  if (this.curContext() === types.stmt_head) {
    this.state.context.pop();
  }
  this.state.inForHeaderInit = false;
  this.state.exprAllowed = type.beforeExpr;
}

tt.braceL.updateContext = function(type) {
  this.state.context.push(types.obj_expr);
  this.state.exprAllowed = type.beforeExpr;
};

tt.dollarBraceL.updateContext = function(type) {
  this.state.context.push(types.tmpl_expr);
  this.state.exprAllowed = type.beforeExpr;
};

let blockStatementUpdateContext = function(type) {
  // TODO: don't push stmt_head for `if` when it's an implicit conditional
  this.state.context.push(types.stmt_head);
  this.state.exprAllowed = type.beforeExpr;
};
tt._if.updateContext = blockStatementUpdateContext;

tt._for.updateContext = function(type) {
  this.state.inForHeaderInit = true;
  this.state.context.push(types.stmt_head);
  this.state.exprAllowed = type.beforeExpr;
}

tt._while.updateContext = function(type) {
  if (this.state.inForHeaderInit) {
    this.state.inForHeaderInit = false;
  } else {
    this.state.context.push(types.stmt_head);
  }
  this.state.exprAllowed = type.beforeExpr;
};

tt.excl.updateContext = function(type, prevType) {
  if (prevType === tt._if) {
    this.state.context.pop();
  }
  this.state.exprAllowed = true;
}

// TODO: do we need to detect if this is a list of parameters
tt.parenL.updateContext = function(type) {
  this.state.context.push(types.paren_expr);
  this.state.exprAllowed = type.beforeExpr;
};

tt.incDec.updateContext = function() {
  // keep `this.state.exprAllowed` unchanged
};

tt._function.updateContext = function(type) {
  if (this.curContext() !== types.stmt) {
    this.state.context.push(types.func_expr);
  }
  this.exprAllowed = type.beforeExpr;
};

tt.backQuote.updateContext = function(type) {
  if (this.curContext() === types.tmpl_str) {
    this.state.context.pop();
  } else {
    this.state.context.push(types.tmpl_str);
  }
  this.exprAllowed = type.beforeExpr;
};


tt.braceR.updateContext = function() {
  if (this.state.context.length === 1) {
    this.state.exprAllowed = true;
    return;
  }
  let out = this.state.context.pop();
  if (out === types.tmpl_expr) {
    this.state.exprAllowed = true;
  } else {
    this.state.exprAllowed = !out.isExpr;
  }
};

tt.parenR.updateContext = function(type) {
  if (this.state.context.length === 1) {
    this.state.exprAllowed = true;
    return;
  }
  this.state.context.pop();
  this.state.exprAllowed = type.beforeExpr;
};

tt.dedent.updateContext = function() {
  if (this.state.context.length === 1) {
    this.state.exprAllowed = true;
    return;
  }
  let out = this.state.context.pop();
  if (out === types.stmt && (this.curContext() === types.func_expr)) {
    this.state.context.pop();
    this.state.exprAllowed = false;
  } else {
    this.state.exprAllowed = !out.isExpr;
  }
};
