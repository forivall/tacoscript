
// TODO: also print locations for source maps, etc.
// TODO: get code from cst instead of from string

import * as t from "babel-types";

export function _getCodeFromNode(node) {
  if (this.code && node.start != null && node.end != null) return this.code.slice(node.start, node.end);
}

export function Identifier(node, parent) {
  let standalone = parent.shorthand || !(
    (t.isMemberExpression(parent) && node === parent.property) ||
    (t.isProperty(parent) && node === parent.key && !parent.computed/* && !parent.method && node.kind !== "get" && node.kind !== "set"*/) ||
    ((parent.type === "ObjectProperty" || parent.type === "ObjectMethod") && node === parent.key && !parent.computed/* && !parent.method && node.kind !== "get" && node.kind !== "set"*/) ||
    (t.isExportNamespaceSpecifier(parent) && node.name === "default") ||
    (t.isImportSpecifier(parent) && parent.local) ||
    (t.isExportSpecifier(parent) && node.name === parent.exported.name && node.name === "default") ||
    t.isMetaProperty(parent) ||
  false);
  this.push({type: "name", value: {
    value: node.name,
    code: this._getCodeFromNode(node),
    standalone: standalone
  }});
}

export function RestElement(node) {
  this.push("...");
  this.print(node, "argument");
}

export {
  RestElement as SpreadElement,
  RestElement as SpreadProperty,
  RestElement as RestProperty,
};

export function ObjectExpression(node) {
  this.push("{");
  this.printLiteralBody(node, "properties");
  if (node.hasTrailingComma || node.properties.hasTrailingComma) this.push(",");
  this.push("}");
}
export {ObjectExpression as ObjectPattern};

export function Property(node) {
  if (node.method || node.kind === "get" || node.kind === "set") {
    this.printMultiple(node, "decorators", {separator: null});
    this._method(node);
  } else {
    this.ObjectProperty(node);
  }
}

export function ObjectMethod(node) {
  this.printMultiple(node, "decorators", {separator: null});
  this._method(node, true);
}

export function ObjectProperty(node) {
  this.printMultiple(node, "decorators", {separator: null});

  if (node.computed) {
    this.push("[");
    this.print(node, "key");
    this.push("]");
  } else {
    // print `({ foo: foo = 5 } = {})` as `({ foo = 5 } = {});`
    if (t.isAssignmentPattern(node.value) && t.isIdentifier(node.key) && node.key.name === node.value.left.name) {
      // but only if it was that same way in the source
      if (node.key.start == null || node.key.start === node.value.left.start && node.key.end === node.value.left.end) {
        this.print(node, "value");
        return;
      }
    }

    this.print(node, "key");

    // shorthand!
    if (node.shorthand &&
      (t.isIdentifier(node.key) &&
       t.isIdentifier(node.value) &&
       node.key.name === node.value.name)) {
      return;
    }
  }

  this.push(":");
  this.print(node, "value");
}

export function ArrayExpression(node) {
  this.push("[");
  this.printLiteralBody(node, "elements");
  if ((node.hasTrailingComma || node.elements.hasTrailingComma) && node.elements[node.elements.length - 1] !== null) this.push(",")
  this.push("]");
}
export {ArrayExpression as ArrayPattern};

// TODO: can be removed when babel 6 drops
export function Literal(node) {
  var val = node.value;

  if (node.regex) {
    return this["RegexLiteral"]({pattern: node.regex.pattern, flags: node.regex.flags, start: node.start, end: node.end});
  }

  switch (typeof val) {
    case "string":
      return this["StringLiteral"](node);

    case "number":
      return this["NumberLiteral"](node);

    case "boolean":
      return this["BooleanLiteral"](node);

    default:
      if (val === null) {
        return this["NullLiteral"](node);
      } else {
        throw new Error("Invalid Literal type");
      }
  }
}

export function RegExpLiteral(node) {
  // TODO: export this as regex token.tostring
  // this.push(`/${node.pattern}/${node.flags}`);
  this.push({type: 'regexp', value: {pattern: node.pattern, flags: node.flags, code: this._getCodeFromNode(node) }});
}
export {RegExpLiteral as RegexLiteral};

export function BooleanLiteral(node) {
  this.push(node.value ? "true" : "false");
}

export function NullLiteral() {
  this.push("null");
}

export function NumericLiteral(node) {
  this.push({type: 'num', value: {value: node.value, code: node.raw || this._getCodeFromNode(node)}});
}
export {NumericLiteral as NumberLiteral};

export function StringLiteral(node) {
  this.push({type: 'string', value: {value: node.value, code: this._getCodeFromNode(node)}});
}

// TODO: move to external module, send PR to babel.
export function _stringLiteral(val) {
  val = JSON.stringify(val);

  // escape illegal js but valid json unicode characters
  val = val.replace(/[\u000A\u000D\u2028\u2029]/g, function (c) {
    return "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4);
  });

  if (this.format.quotes === "single") {
    // remove double quotes
    val = val.slice(1, -1);

    // unescape double quotes
    val = val.replace(/\\"/g, '"');

    // escape single quotes
    val = val.replace(/'/g, "\\'");

    // add single quotes
    val = `'${val}'`;
  }

  return val;
}
