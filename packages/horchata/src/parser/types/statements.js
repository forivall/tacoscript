/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import { types as tt } from "../../tokenizer/types";

// ### Statement parsing

export function parseStatement(declaration = true, topLevel = false) {
  let parentStatementAllowed = this.state.statementAllowed;
  this.state.statementAllowed = true;

  if (this.match(tt.at)) {
    this.parseDecorators();
  }

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  let startType = this.state.cur.type;
  let node = this.startNode();

  switch(startType) {
    // Keywords
    case tt._break: node = this.parseBreakStatement(node); break;
    case tt._class:
      if (!declaration) this.unexpected();
      node = this.parseClassDeclaration(node); break;
    case tt._continue: node = this.parseContinueStatement(node); break;
    case tt._debugger: node = this.parseDebuggerStatement(node); break;
    case tt._do: node = this.parseDoStatement(node); break;
    case tt._export:
      if (!this.options.allowImportExportEverywhere && !topLevel) {
        this.raise(this.start, "`export` may only appear at the top level");
      }
      node = this.parseExportDeclaration(node); break;
    case tt._for: node = this.parseForStatement(node); break;
    case tt._function:
      if (!declaration) this.unexpected();
      node = this.parseFunctionDeclaration(node); break;
    case tt._if:
      node = this.parseIfStatementOrConditionalExpression(node); break;
    case tt._import:
      if (!this.options.allowImportExportEverywhere && !topLevel) {
        this.raise(this.start, "`import` may only appear at the top level");
      }
      node = this.parseImportDeclaration(node); break;
    case tt._pass: node = this.parseEmptyStatement(node); break;
    case tt._return: node = this.parseReturnStatement(node); break;
    case tt._switch: node = this.parseSwitchStatement(node); break;
    case tt._throw: node = this.parseThrowStatement(node); break;
    case tt._try: node = this.parseTryStatement(node); break;
    case tt._while: node = this.parseWhileStatement(node); break;
    case tt._with: node = this.parseWithStatement(node); break;
    case tt._yield: node = this.parseYieldStatement(node); break;

    // Variable declaration
    case tt._let:
    case tt._const:
      if (!declaration) this.unexpected();
      // fallthrough
    case tt._var:
      node = this.parseDeclarationStatement(node, startType); break;

    // Symbols
    case tt.excl: node = this.parseBlockStatement(node); break;
    default:
      let maybeOtherStatementNode = this.parseOtherStatement(node);
      if (maybeOtherStatementNode) {
        node = maybeOtherStatementNode;
        break;
      }
      // If the statement does not start with a statement keyword or a
      // brace, it's an ExpressionStatement or LabeledStatement. We
      // simply start parsing an expression, and afterwards, if the
      // next token is a colon and the expression was a simple
      // Identifier node, we switch to interpreting it as a label.

      let maybeName = this.state.value;
      let expr = this.parseExpression();

      if (startType === tt.name && expr.type === "Identifier" && this.eat(tt.colon)) {
        node = this.parseLabeledStatement(node, maybeName, expr);
      } else {
        node = this.parseExpressionStatement(node, expr);
      }
  }

  this.state.statementAllowed = parentStatementAllowed;
  return node;
}

export function parseOtherStatement() {
  // Purposefully left empty for plugins. See docs/horchata-plugins.md#empty-functions

  // TODO: move this document to docs
  // Purposefully left empty. This is a point where it is useful for plugins
  // to be able to extend. However, even though this function does nothing,
  // `inner()` should still be called for all of the other plugins.

  // plugins should return the node that they parsed, and should check
  // the result of inner before trying to parse a statement themselves

  // Eventually, this should be extended with better interaction between the
  // differing precedence levels of different plugins
  // TODO: look at sweet.js for prior art.

  // usually would start with
  // let startType = this.state.type;
  // switch(startType) { case tt._myType: ...}
  // or
  // if (match(tt._myType)) ...
  return null;
}

// statement within a "do" expression
export function parseDoExpressionStatement() {
  this.parseStatement(false);
}

export function parseTopLevelStatement() {
  this.parseStatement(true, true);
}

export function parseDecorators() {
  while (this.match(tt.at)) {
    this.state.decorators.push(this.parseDecorator());
  }
  this.checkDecorators();
}

//// Statement parsers by type ////

// We overload the if keyword, so this intermediary parser is required until we
// figure out what it is.
export function parseIfStatementOrConditionalExpression(node) {
  this.next();
  if (this.match(tt.excl)) {
    node = this.parseExpressionStatement(node, this.parseConditionalExpression());
  } else {
    node = this.parseIfStatement(node);
  }
  return node;
}

export function parseIfStatement(node) {
  node.test = this.parseExpression();
  node.consequent = this.parseStatementBody();
  node.alternate = this.eat(tt._else) ? this.parseStatementBody() : null;
  return this.finishNode(node, "IfStatement");
}

export function parseStatementBody() {
  let node;
  if (this.eat(tt.indent)) {
    node = this.startNode();
    this.eat(tt.newline) || this.unexpected();
    this.parseBlockBody(node);
    node = this.finishNode();
  } else {
    this.eat(tt._then);
    node = this.parseStatement();
  }
  return node;
}

// Parse a switch, as a statement.
export function parseSwitchStatement(node) {
  this.next();
  if (this.eat(tt.excl)) {
    throw new Error("Not Implemented");
  } else {
    this.parseSafeSwitchStatement(node)
  }
}

// should be overridden by safe switch statement plugin
export function parseSafeSwitchStatement(/*node*/) {
  this.raise(this.state.pos, "Raw switch statements require `!` after `switch`. Enable the 'safe switch statement' plugin");
}

// Parse a list of variable declarations, as a statement. Equivalent to `parseVarStatement`
export function parseDeclarationStatement(node, kind) {
  this.next();
  this.parseDeclaration(node, kind);
  if (this.match(tt.eof)) this.warn("No newline at end of file");
  this.match(tt.dedent) || this.eat(tt.newline) || this.eat(tt.eof) || this.unexpected();
  return this.finishNode(node, "VariableDeclaration");
}

// Parse a list of variable declarations. Equivalent to `parseVar`
export function parseDeclaration(node, kind, declarationContext = {}) {
  node.declarations = [];
  node.kind = kind.keyword;
  let isIndent = this.eat(tt.indent);
  if (isIndent) this.eat(tt.newline) || this.unexpected();
  for (;;) {
    if (isIndent && this.eat(tt.dedent)) break;
    let decl = this.startNode();
    decl = this.parseDeclarationAssignable(decl);
    if (this.eat(tt.eq)) {
      decl.init = this.parseExpression(declarationContext);
    } else {
      decl.init = null;
    }
    this.checkDeclaration(decl, kind, declarationContext);
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));

    if (!isIndent) isIndent = this.eat(tt.indent);
    if (!(this.eat(tt.comma) || isIndent && this.eat(tt.newline))) break;
  }
  return node;
}

// keep this at the bottom.
// If we're not parsing a statement, it's an ExpressionStatement!
export function parseExpressionStatement(node, expr) {
  node.expression = expr;
  // TODO: also allow `and then`
  // `and then` will be handled after boolean expressions are properly handled --
  // the posiition of the and will be stored, and then read here, similar to how
  // arrow functions work.
  if (this.match(tt.eof)) this.warn(this.state.pos, "No newline at end of file");
  this.eat(tt.newline) || this.eat(tt.eof) || this.unexpected();
  return this.finishNode(node, "ExpressionStatement");
}
