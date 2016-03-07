import * as t from "./index";

/**
 * Return a list of binding identifiers associated with the input `node`.
 */

export function getBindingIdentifiers(
  node: Object,
  duplicates?: boolean,
  outerOnly?: boolean
): Object {
  let search = [].concat(node);
  let ids    = Object.create(null);

  while (search.length) {
    let id = search.shift();
    if (!id) continue;

    let keys = t.getBindingIdentifiers.keys[id.type];

    if (t.isIdentifier(id)) {
      if (duplicates) {
        let _ids = ids[id.name] = ids[id.name] || [];
        _ids.push(id);
      } else {
        ids[id.name] = id;
      }
      continue;
    }

    if (t.isExportDeclaration(id)) {
      if (t.isDeclaration(node.declaration)) {
        search.push(node.declaration);
      }
      continue;
    }

    if (outerOnly) {
      if (t.isFunctionDeclaration(id)) {
        search.push(id.id);
        continue;
      }

      if (t.isFunctionExpression(id)) {
        continue;
      }
    }

    if (keys) {
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (id[key]) {
          search = search.concat(id[key]);
        }
      }
    }
  }

  return ids;
}

/**
 * Mapping of types to their identifier keys.
 */

getBindingIdentifiers.keys = {
  DeclareClass: ["id"],
  DeclareFunction: ["id"],
  DeclareModule: ["id"],
  DeclareVariable: ["id"],
  InterfaceDeclaration: ["id"],
  TypeAlias: ["id"],

  CatchClause: ["param"],
  LabeledStatement: ["label"],
  UnaryExpression: ["argument"],
  AssignmentExpression: ["left"],

  ImportSpecifier: ["local"],
  ImportNamespaceSpecifier: ["local"],
  ImportDefaultSpecifier: ["local"],
  ImportDeclaration: ["specifiers"],

  ExportSpecifier: ["exported"],
  ExportNamespaceSpecifier: ["exported"],
  ExportDefaultSpecifier: ["exported"],

  FunctionDeclaration: ["id", "params"],
  FunctionExpression: ["id", "params"],

  ClassDeclaration: ["id"],
  ClassExpression: ["id"],

  RestElement: ["argument"],
  UpdateExpression: ["argument"],

  RestProperty: ["argument"],
  ObjectProperty: ["value"],

  AssignmentPattern: ["left"],
  ArrayPattern: ["elements"],
  ObjectPattern: ["properties"],

  VariableDeclaration: ["declarations"],
  VariableDeclarator: ["id"]
};

export function getOuterBindingIdentifiers(
  node: Object,
  duplicates?: boolean,
): Object {
  return getBindingIdentifiers(node, duplicates, true);
}
