import { types as tt } from "../../tokenizer/types";
import Parser from "../index";
import { lineBreak } from "../../util/whitespace";

const pp = Parser.prototype;

// ### Statement parsing

pp.parseStatement = function(declaration = true, topLevel = false) {
  let parentStatementAllowed = this.state.statementAllowed;
  this.state.statementAllowed = true;

  if (this.match(tt.at)) {
    this.parseDecorators();
  }

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  let startType = this.state.type;
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
    case tt._if: node = this.parseIfStatement(node); break;
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
      node = this.parseVariableDeclaration(node, startType); break;

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

pp.parseOtherStatement = function() {
  // Purposefully left empty. This is a point where it is useful for plugins
  // to be able to extend. However, even though this function does nothing,
  // `inner()` should still be called for all of the other plugins.

  // plugins should return the node that they parsed, and should check
  // the result of inner before trying to parse a statement themselves

  // usually would start with
  // let startType = this.state.type;
  return null;
}

pp.parseDoStatementStatement = function() {
  this.parseStatement(false);
}

pp.parseTopLevelStatement = function() {
  this.parseStatement(true, true);
}

pp.parseDecorators = function() {
  while (this.match(tt.at)) {
    this.state.decorators.push(this.parseDecorator());
  }
  this.checkDecorators();
}

pp.parseSwitchStatement = function(node) {
  this.next();
  if (this.eat(tt.excl)) {
    throw new Error("Not Implemented");
  } else {
    this.parseSafeSwitchStatement(node)
  }
}

// should be overridded by plugin
pp.parseSafeSwitchStatement = function(node) { this.unexpected(); }

pp.checkDecorators = function() {
  // TODO
  // checks are moved to other functions, so that plugins can override them for extended syntax.
  // i.e. allow adding decorators to standalone functions
  // let allowExport = this.state.statementAllowed
}
