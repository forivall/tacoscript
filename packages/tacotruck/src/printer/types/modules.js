
import * as t from "babel-types";

export function ImportSpecifier(node) {

  this.print(node, "imported");
  if (node.local && node.local.name !== node.imported.name) {
    this.keyword("as");
    this.print(node, "local");
  }
}

export function ImportDefaultSpecifier(node) {
  this.print(node, "local");
}

export function ExportDefaultSpecifier(node) {
  this.print(node, "exported");
}

export function ExportSpecifier(node) {
  this.print(node, "local");
  if (node.exported && node.local.name !== node.exported.name) {
    this.keyword("as");
    this.print(node, "exported");
  }
}

export function ExportNamespaceSpecifier(node) {
  this.push("*")
  this.keyword("as");
  this.print(node, "exported");
}

export function ExportAllDeclaration(node) {
  this.keyword("export");
  this.push("*");
  if (node.exported) {
    this.keyword("as");
    this.print(node, "exported");
  }
  this.keyword("from");
  this.print(node, "source");
  this.lineTerminator();
}

export function ExportNamedDeclaration() {
  this.keyword("export");
  ExportDeclaration.apply(this, arguments);
}

export function ExportDefaultDeclaration() {
  this.keyword("export");
  this.keyword("default");
  ExportDeclaration.apply(this, arguments);
}

function ExportDeclaration(node) {
  if (node.declaration) {
    this.print(node, "declaration");
  } else {
    if (node.exportKind === "type") {
      this.keyword("type");
    }

    // TODO: share code between export and import
    let specifiers = node.specifiers.slice(0);

    let first = specifiers[0];
    let hasSpecial = false;
    if (t.isExportDefaultSpecifier(first) || t.isExportNamespaceSpecifier(first)) {
      hasSpecial = true;
      let defaultSpecifier = specifiers.shift();
      this._print(defaultSpecifier, node, {});
      if (specifiers.length) {
        this.push(",");
      }
    }

    if (specifiers.length || (!specifiers.length && !hasSpecial)) {
      this.push("{");
      if (specifiers.length) {
        if (this.format.preserveLines) this.indent();
        this._printMultiple(specifiers, node, { separator: ",", omitSeparatorIfNewline: true });
        if (this.format.preserveLines) this.dedent();
      }
      if (node.hasTrailingComma) this.push(",");
      if (this.format.preserveLines && node.source) this.catchUp(node.source, node);
      this.push("}");
    }

    if (node.source) {
      this.keyword("from");
      this.print(node, "source");
    }
  }

  this.lineTerminator();
}

export function ImportDeclaration(node) {
  this.keyword("import");

  if (node.importKind === "type" || node.importKind === "typeof") {
    this.keyword(node.importKind);
  }

  // TODO: share code between export and import
  let specifiers = node.specifiers.slice(0);
  if (specifiers && specifiers.length) {
    let first = specifiers[0];
    if (t.isImportDefaultSpecifier(first)) {
      this._print(specifiers.shift(), node, {});
      if (specifiers.length) this.push(",");
    }
    first = specifiers[0];
    if (t.isImportNamespaceSpecifier(first)) {
      this._print(specifiers.shift(), node, {});
      if (specifiers.length) this.push(",");
    }

    if (specifiers.length) {
      this.push("{");
      if (this.format.preserveLines) this.indent();
      this._printMultiple(specifiers, node, { separator: ",", omitSeparatorIfNewline: true });
      if (this.format.preserveLines) this.dedent();
      if (node.hasTrailingComma) this.push(",");
      if (this.format.preserveLines) this.catchUp(node.source, node);
      this.push("}");
    }

    this.keyword("from");
  } else if (node.isEmptyImport) {
    this.push("{");
    if (node.hasTrailingComma) this.push(",")
    this.push("}");
    this.keyword("from");
  }

  this.print(node, "source");
  this.lineTerminator();
}

export function ImportNamespaceSpecifier(node) {
  this.push("*");
  this.keyword("as");
  this.print(node, "local");
}
