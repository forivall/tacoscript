/*
 * Copyright (C) 2012-2015 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {types as tt} from "../../lexer/types";

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
      this.add(node, "specifiers", this.finishNode(firstSpecifier, "ExportNamespaceSpecifier"));
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
    this.assign(node, "declaration", expr);
    nodeType = "ExportDefaultDeclaration";
  } else if (this.state.cur.type.keyword) {
    node.specifiers = [];
    node.source = null;
    this.assign(node, "declaration", this.parseExportDeclaration(node));
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
    this.assign(node, "source", this.parseExpressionAtomic());
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

  this.parseIndentableList(tt.braceR, {allowTrailingComma: true}, () => {
    let isDefault = this.match(tt._default);
    if (isDefault && !needsFrom) needsFrom = true;

    let node = this.startNode();
    this.assign(node, "local", this.parseIdentifier({allowKeywords: isDefault, convertKeywordToken: false}));
    if (this.eat(tt._as)) {
      this.assign(node, "exported", this.parseIdentifier({allowKeywords: true}));
    } else {
      this.popReference(node, "local");
      this.assign(node, "exported", node.local.__clone());
    }
    this.add(parent, "specifiers", this.finishNode(node, "ExportSpecifier"));
  });

  // https://github.com/ember-cli/ember-cli/pull/3739
  if (needsFrom && !this.match(tt._from)) {
    this.unexpected();
  }

  return parent;
}

export function isExportDefaultSpecifier() {
  if (this.match(tt.name)) {
    // TODO: flow plugin should ignore flow-specific contextual keywords
    return true;
  }

  if (!this.match(tt._default)) {
    return false;
  }
  this.ensureLookahead();
  return this.matchNext(tt.comma) || this.matchNext(tt._from);
}

export function parseExportDeclaration() {
  return this.parseStatement();
}

// const empty = Symbol("EmptySpecifiers");
const empty = "__emptySpecifiers";
// Parses module import declarations
export function parseImport(node) {
  this.next();

  if (this.match(tt.string)) {
    node.specifiers = [];
    this.addExtra(node, "noBrace", true);
    this.assign(node, "source", this.parseExpressionAtomic());
  } else {
    node.specifiers = [];
    node = this.parseImportSpecifiers(node);
    this.eat(tt._from) || this.unexpected();
    this.match(tt.string) || this.unexpected();
    this.assign(node, "source", this.parseExpressionAtomic());
  }
  this.eatLineTerminator();
  return this.finishNode(node, "ImportDeclaration");
}

// Parses a comma-separated list of module imports.
export function parseImportSpecifiers(node) {
  let hasDefault = false;
  if (this.match(tt.name)) {
    // import defaultObj, { x, y as z } from '...'
    let specifier = this.startNode();
    this.assign(specifier, "local", this.parseIdentifier());
    this.checkAssignable(specifier.local, {isBinding: true});
    this.add(node, "specifiers", this.finishNode(specifier, "ImportDefaultSpecifier"));
    hasDefault = true;
  }
  if (!hasDefault || this.eat(tt.comma)) {
    if (this.match(tt.star)) {
      let specifier = this.startNode();
      this.next();
      this.eat(tt._as) || this.unexpected();
      this.assign(specifier, "local", this.parseIdentifier());
      this.checkAssignable(specifier.local, {isBinding: true});
      this.add(node, "specifiers", this.finishNode(specifier, "ImportNamespaceSpecifier"));
    } else {
      this.eat(tt.braceL) || this.unexpected();
      this.parseIndentableList(tt.braceR, {allowTrailingComma: true}, () => {
        let specifier = this.startNode();
        this.assign(specifier, "imported", this.parseIdentifier({allowKeywords: true}));
        if (this.eat(tt._as)) {
          this.assign(specifier, "local", this.parseIdentifier());
        } else {
          this.assign(specifier, "local", specifier.imported.__clone());
          this.popReference(specifier, "local");
        }
        this.checkAssignable(specifier.local, {isBinding: true});
        this.add(node, "specifiers", this.finishNode(specifier, "ImportSpecifier"));
      });
    }
  }
  return node;
}
