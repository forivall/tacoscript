/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../../lexer/types";

// Atoms for marking loops
const loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

// ### Statement parsing

// TODO: convert to use `statementContext` instead of explicit
//       `declaration` and `topLevel`
export function parseStatement(declaration = true, topLevel = false) {
  let parentStatementAllowed = this.state.statementAllowed;
  this.state.statementAllowed = true;
  let decoratorLoc;

  if (this.matchDecoratorSymbol()) {
    decoratorLoc = this.state.cur.start;
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
      node = this.parseExport(node); break;
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
      node = this.parseImport(node); break;
    case tt._pass: node = this.parseEmptyStatement(node); break;
    case tt._return: node = this.parseReturnStatement(node); break;
    case tt._switch: node = this.parseSwitchStatementMaybeSafe(node); break;
    case tt._throw: node = this.parseThrowStatement(node); break;
    case tt._try: node = this.parseTryStatement(node); break;
    case tt._while: node = this.parseWhileStatement(node); break;
    case tt._with: node = this.parseWithStatement(node); break;

    // Variable declaration
    case tt._extern:
      if (!this.hasFeature("externDeclarations")) {
        this.raise(this.state.cur.start, '"externDeclarations" not enabled');
      }
    case tt._let:
    case tt._const:
      if (!declaration) this.unexpected();
      // fallthrough
    case tt._var:
      node = this.parseDeclarationStatement(node, this.state.cur); break;

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

      let maybeName = this.state.cur.value.value || this.state.cur.value;
      let expr = this.parseExpression();

      if (startType === tt.name && expr.type === "Identifier" && this.eat(tt.colon)) {
        node = this.parseLabeledStatement(node, maybeName, expr);
      } else {
        node = this.parseExpressionStatement(node, expr);
      }

      if (this.state.decorators.length) {
        this.raise(decoratorLoc, "Leading decorators must be attached to a compatible statement")
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
  // let startType = this.state.cur.type;
  // switch(startType) { case tt._myType: ...}
  // or
  // if (match(tt._myType)) ...
  return null;
}

// statement within a "do" expression
export function parseDoExpressionStatement() {
  this.parseStatement(false);
}

export function parseDecorators() {
  const atDecorator = !this.hasFeature("strudelThisMember");
  while (atDecorator ? this.match(tt.at) : this.match(tt.relational) && this.state.cur.value === ">") {
    this.state.decorators.push(this.parseDecorator());
  }
  this.checkDecorators();
  this.eat(tt.newline);
}

export function parseDecorator() {
  let node = this.startNode();
  this.next();
  // TODO: see if we should be more restrictive than JavaScript.
  //       currently, we disallow expressions that don't make sense as decorators.
  // this.assign(node, "expression", this.parseExpression());
  this.assign(node, "expression", this.parseExpressionSubscripts({}));
  return this.finishNode(node, "Decorator");
}

export function consumeDecorators(node) {
  this.addAll(node, "decorators", this.state.decorators);
  this.state.decorators = [];
  return node;
}

//// Statement parsers by type ////

export function parseBreakStatement(node) {
  return this.finishNode(this.parseJump(node, "break"), "BreakStatement");
}

export function parseContinueStatement(node) {
  return this.finishNode(this.parseJump(node, "continue"), "ContinueStatement");
}

export function parseJump(node, keyword) {
  let isBreak = keyword === "break";
  this.next();
  if (this.match(tt.name)) {
    this.assign(node, "label", this.parseIdentifier());
  } else {
    node.label = null;
  }
  this.eatLineTerminator() || this.unexpected();

  this.checkJump(node, keyword);
  return node;
}

export function parseDebuggerStatement(node) {
  this.next();
  this.eatLineTerminator() || this.unexpected();
  return this.finishNode(node, "DebuggerStatement");
}

export function parseDoStatement(node) {
  this.next();
  this.state.labels.push(loopLabel);
  this.assign(node, "body", this.parseStatementBody());
  this.state.labels.pop();
  this.eat(tt._while) || this.unexpected();
  this.assign(node, "test", this.parseExpression());
  this.eatLineTerminator() || this.unexpected();
  return this.finishNode(node, "DoWhileStatement");
}

export function parseEmptyStatement(node) {
  this.next();
  this.eatLineTerminator() || this.unexpected();
  return this.finishNode(node, "EmptyStatement");
}

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (`while` immediately after the `for`), it is a regular
// `for` loop.

export function parseForStatement(node) {
  this.next();
  this.state.labels.push(loopLabel);

  if (this.match(tt._while) ||
      this.match(tt._update) ||
      this.match(tt.indent) ||
      this.match(tt._then) ||
      this.match(tt.newline) ||
      this.match(tt.eof) ||
      false) {
    node = this.parseFor(node, null);
  } else if (this.match(tt._var) || this.match(tt._let) || this.match(tt._const)) {
    let init = this.startNode();
    let varToken = this.state.cur;
    this.next();
    init = this.parseDeclaration(init, varToken, {isFor: true});
    init = this.finishNode(init, "VariableDeclaration");
    if ((this.match(tt._in) || this.match(tt._of)) &&
        init.declarations.length === 1 &&
        (varToken.kind === tt._var || !init.declarations[0].init)) {
      node = this.parseForIn(node, init);
    } else {
      node = this.parseFor(node, init);
    }
  } else {
    let expressionContext = {isFor: true, shorthandDefaultPos: {start: 0}};
    let init = this.parseExpression(expressionContext);
    if (this.match(tt._in) || this.match(tt._of)) {
      this.toAssignable(init);
      this.checkAssignable(init);
      node = this.parseForIn(node, init);
    } else {
      this.checkExpression(init, expressionContext);
      node = this.parseFor(node, init);
    }
  }
  this.state.labels.pop();
  return node;
}

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

export function parseFor(node, init) {
  this.assign(node, "init", init);
  this.assign(node, "test", this.eat(tt._while) ? this.parseExpression() : null);
  this.assign(node, "update", this.eat(tt._update) ? this.parseExpression() : null);
  this.assign(node, "body", this.parseStatementBody());
  return this.finishNode(node, "ForStatement");
}

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

export function parseForIn(node, init) {
  let type = this.match(tt._in) ? "ForInStatement" : "ForOfStatement";
  this.next();
  this.assign(node, "left", init);
  this.assign(node, "right", this.parseExpression());
  this.assign(node, "body", this.parseStatementBody());
  return this.finishNode(node, type);
}

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
  this.assign(node, "test", this.parseExpression());
  this.assign(node, "consequent", this.parseStatementBody());
  this.assign(node, "alternate", this.eat(tt._else) ? this.parseStatementBody() : null);
  return this.finishNode(node, "IfStatement");
}

export function parseLabeledStatement(node, maybeName, expr) {
  this.checkLabelName(maybeName, expr);
  let kind = this.state.cur.type.isLoop ? "loop" : this.match(tt._switch) ? "switch" : null;
  for (let i = this.state.labels.length - 1; i >= 0; i--) {
    let label = this.state.labels[i]
    if (label.statementStart === node.start) {
      label.statementStart = this.state.cur.start;
      label.kind = kind;
    } else break;
  }
  this.assign(node, "label", expr);
  this.state.labels.push({name: maybeName, kind: kind, statementStart: this.state.cur.start});
  this.assign(node, "body", this.parseStatement(true));
  this.state.labels.pop();
  return this.finishNode(node, "LabeledStatement");
}

export function parseReturnStatement(node) {
  // TODO: move to validator
  if (!this.state.inFunction && !this.options.allowReturnOutsideFunction)
    this.raise(this.start, "'return' outside of function");
  this.next();

  // TODO: allow indented block-style return statement

  if (this.eatLineTerminator()) {
    node.argument = null;
  } else {
    this.assign(node, "argument", this.parseExpression());
    this.eatLineTerminator() || this.unexpected();
  }
  return this.finishNode(node, "ReturnStatement")
}

export function parseStatementBody(blockContext = {}) {
  const forceBlock = !!blockContext.forceBlock;
  let node;
  if (this.match(tt.indent)) {
    node = this.startNode();
    this.next();
    this.eat(tt.newline);
    this.parseBlockBody(node, {...blockContext, forceBlock: false});
    node = this.finishNode(node, "BlockStatement");
  } else {
    let ateThen = this.eat(tt._then);
    if (!ateThen && this.matchLineTerminator()) {
      node = this.startNode();
      node = this.initBlockBody(node, {});
      this.eatLineTerminator();
      node = this.finishNode(node, "BlockStatement");
    } else {
      if (forceBlock) {
        node = this.parseStatementBlock();
      } else {
        node = this.parseStatement();
      }
    }
  }
  return node;
}

export function parseStatementBlock() {
  let node = this.startNode();
  node = this.initBlockBody(node, {});
  this.add(node, "body", this.parseStatement());
  return this.finishNode(node, "BlockStatement");
}

// Parse a switch, as a statement.
export function parseSwitchStatementMaybeSafe(node) {
  this.next();
  if (this.eat(tt.excl)) {
    node = this.parseSwitchStatement(node);
  } else {
    node = this.parseSafeSwitchStatement(node)
  }
  return node;
}

export function parseSwitchStatement(node) {
  this.assign(node, "discriminant", this.parseExpression());
  node.cases = [];
  if (this.eatLineTerminator()) return this.finishNode(node, "SwitchStatement");

  this.eat(tt.indent) || this.unexpected();
  this.eat(tt.newline);

  this.state.labels.push(switchLabel);

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. `cur` is used to keep the node that we are currently
  // adding statements to.

  let sawDefault = false;
  while (!this.match(tt.dedent)) {
    let cur = this.startNode();
    if (this.eat(tt._case)) {
      this.assign(cur, "test", this.parseExpression());
      cur = this.parseSwitchCaseBody(cur);
    } else if (this.eat(tt._default)) {
      sawDefault = sawDefault ? this.raise(this.state.prev.start, "Multiple default clauses") : true;
      cur.test = null;
      cur = this.parseSwitchCaseBody(cur, true);
    } else {
      this.unexpected();
    }
    this.add(node, "cases", this.finishNode(cur, "SwitchCase"));
  }
  this.next(); // dedent
  this.state.labels.pop();

  return this.finishNode(node, "SwitchStatement");
}

export function parseSwitchCaseBody(node, isDefault = false) {
  let finishedDirectives = false;
  node.consequent = [];
  let isEmpty = false;
  if (!this.match(tt.indent)) {
    isEmpty = this.eatLineTerminator() || this.match(tt._case);
    if (!isEmpty) {
      if (!isDefault) this.eat(tt._then) || this.unexpected();
      this.add(node, "consequent", this.parseStatement(true));
    }
  }
  if (!isEmpty && this.eat(tt.indent)) {
    this.eat(tt.newline);
    while (!this.eat(tt.dedent)) {
      this.add(node, "consequent", this.parseStatement(true));
    }
    this.eat(tt.newline);
  }
  return node;
}

// should be overridden by safe switch statement plugin
export function parseSafeSwitchStatement(/*node*/) {
  this.raise(this.state.pos, "Raw switch statements require `!` after `switch`. Enable the 'safe switch statement' plugin");
}

export function parseThrowStatement(node) {
  this.next();
  let indented = this.eat(tt.indent);
  if (indented) this.eat(tt.newline);
  this.assign(node, "argument", this.parseExpression());
  if (indented) {
    this.eat(tt.newline);
    this.eat(tt.dedent) || this.unexpected();
  }
  this.eatLineTerminator() || this.unexpected();
  return this.finishNode(node, "ThrowStatement");
}

export function parseTryStatement(node) {
  this.next();
  this.assign(node, "block", this.parseStatementBody({forceBlock: true}));
  node.handler = null;
  node.guardedHandlers = []; // always empty in js
  if (this.match(tt._catch)) {
    let clause = this.startNode();
    this.next();
    this.assign(clause, "param", this.parseBindingAtomic());
    this.checkAssignable(clause.param, {isBinding: true});
    this.assign(clause, "body", this.parseStatementBody({forceBlock: true}));
    this.assign(node, "handler", this.finishNode(clause, "CatchClause"));
  }
  this.assign(node, "finalizer", this.eat(tt._finally) ? this.parseStatementBody({forceBlock: true}) : null);
  this.checkTryStatement(node);
  return this.finishNode(node, "TryStatement");
}

export function parseWhileStatement(node) {
  this.next();
  this.assign(node, "test", this.parseExpression());
  this.state.labels.push(loopLabel);
  this.assign(node, "body", this.parseStatementBody());
  this.state.labels.pop();
  return this.finishNode(node, "WhileStatement");
}

export function parseWithStatement(node) {
  this.checkWithStatementAllowed();
  this.next();
  this.assign(node, "object", this.parseExpression());
  this.assign(node, "body", this.parseStatementBody());
  return this.finishNode(node, "WithStatement");
}

// Parse a list of variable declarations, as a statement. Equivalent to `parseVarStatement`
export function parseDeclarationStatement(node, kindToken) {
  this.next();
  node = this.parseDeclaration(node, kindToken);
  this.eatLineTerminator({allowPrev: true}) || this.unexpected();
  return this.finishNode(node, "VariableDeclaration");
}

// Parse a list of variable declarations. Equivalent to `parseVar`
export function parseDeclaration(node, kindToken, declarationContext = {}) {
  node.declarations = [];
  const kind = kindToken.type.keyword;
  this.assign(node, "kind", kind, {token: kindToken});
  this.parseIndentableList(null, {noTerminator: declarationContext.isFor}, () => {
    let decl = this.startNode();
    decl = this.parseDeclarationAssignable(decl);
    if (this.eat(tt.eq)) {
      this.assign(decl, "init", this.parseExpression(declarationContext));
    } else {
      decl.init = null;
    }
    this.checkDeclaration(decl, kind, declarationContext);
    this.add(node, "declarations", this.finishNode(decl, "VariableDeclarator"));
  });
  if (node.declarations.length === 0) this.unexpected();
  return node;
}

// keep this at the bottom.
// If we're not parsing a statement, it's an ExpressionStatement!
export function parseExpressionStatement(node, expr) {
  this.assign(node, "expression", expr);
  if (expr.type === "ObjectExpression" && !(expr.extra != null && expr.extra.parenthesized)) {
    this.addExtra(expr, "parenthesized", true);
    this.addExtra(expr, "fakeParens", true);
  }
  this.eatLineTerminator({allowPrev: true}) || this.unexpected();
  return this.finishNode(node, "ExpressionStatement");
}
