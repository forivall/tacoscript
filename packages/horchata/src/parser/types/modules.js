/*
 * Copyright (C) 2012-2015 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../../tokenizer/types";

// Parses module export declaration.
export function parseExport(node) {
  let nodeType = "ExportNamedDeclaration";
  this.next();
  // export * from '...'
  if (this.match(tt.star)) {
    let firstSpecifier = this.startNode();
    this.next();
    if (this.eat(tt._as)) {
      firstSpecifier.exported = this.parseIdentifier();
      node.specifiers = [this.finishNode(firstSpecifier, "ExportNamespaceSpecifier")];
      if (this.eat(tt.comma)) node = this.parseExportSpecifiers(node);
      node = this.parseExportFrom(node);
    } else {
      nodeType = "ExportAllDeclaration";
      node = this.parseExportFrom(node);
    }
  } else if (this.isExportDefaultSpecifier()) {
    throw new Error("Not Implemented")
  } else if (this.eat(tt._default)) {
    // TODO: move to "parseExportDefaultDeclaration()"
    let expr = this.startNode();
    if (this.eat(tt._function)) {
      expr = this.parseFunctionNamed(expr, {isOptional: true}, {});
      expr = this.finishNode(expr, "FunctionDeclaration");
    } else if (this.match(tt._class)) {
      expr = this.parseClassDeclaration(expr, {optionalId: true});
    } else {
      expr = this.parseExpressionMaybeKeywordOrAssignment({});
      this.eatLineTerminator();
    }
    node.declaration = expr;
    nodeType = "ExportDefaultDeclaration";
  } else if (this.state.cur.type.keyword) {
    node.specifiers = [];
    node.source = null;
    node.declaration = this.parseExportDeclaration(node);
  } else { // export { x, y as z } [from '...']
    node.declaration = null;
    node = this.parseExportSpecifiers(node);
    node = this.parseExportFrom(node, {isOptional: true});
  }

  this.checkExport(node);
  node = this.takeDecoratorsMaybe(node);
  return this.finishNode(node, nodeType);
}

export function parseExportFrom(node, exportFromContext = {}) {
  let isOptional = !!exportFromContext.isOptional;
  node.source = null;
  if (this.eat(tt._from)) {
    if (!this.match(tt.string)) this.unexpected();
    node.source = this.parseExpressionAtomic();
  } else if (!isOptional) this.unexpected();
  this.eatLineTerminator();
  return node;
}

// Parses a comma-separated list of module exports.
export function parseExportSpecifiers(parent) {
  if (!parent.specifiers) parent.specifiers = [];
  let first = true;
  let needsFrom;

  // export { x, y as z } [from '...']
  this.eat(tt.braceL) || this.unexpected();

  while (!this.eat(tt.braceR)) {
    if (first) first = false;
    else {
      this.eat(tt.comma) || this.unexpected();
      if (this.eat(tt.braceR)) break;
    }

    let isDefault = this.match(tt._default);
    if (isDefault && !needsFrom) needsFrom = true;

    let node = this.startNode();
    node.local = this.parseIdentifier({allowKeywords: isDefault});
    node.exported = this.eat(tt._as) ? this.parseIdentifier({allowKeywords: true}) : node.local.__clone();
    parent.specifiers.push(this.finishNode(node, "ExportSpecifier"));
  }

  // https://github.com/ember-cli/ember-cli/pull/3739
  if (needsFrom && !this.match(tt._from)) {
    this.unexpected();
  }

  return parent;
}

export function isExportDefaultSpecifier() {
  if (!this.match(tt._default)) {
    return false;
  }
  this.ensureLookahead();
  return this.matchNext(tt.comma) || this.matchNext(tt._from);
}

export function parseExportDeclaration() {
  return this.parseStatement();
}

// Parses module import declarations
// TODO
