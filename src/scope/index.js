import includes from "lodash/collection/includes";
import repeating from "repeating";
import Renamer from "./lib/renamer";
import type NodePath from "../path";
import traverse from "../index";
import defaults from "lodash/object/defaults";
import * as messages from "babel-messages";
import Binding from "./binding";
import globals from "globals";
import * as t from "babel-types";

//

const CACHE_SINGLE_KEY = Symbol();
const CACHE_MULTIPLE_KEY = Symbol();

/**
 * To avoid creating a new Scope instance for each traversal, we maintain a cache on the
 * node itself containing all scopes it has been associated with.
 *
 * We also optimise for the case of there being only a single scope associated with a node.
 */

function getCache(node, parentScope, self) {
  let singleCache = node[CACHE_SINGLE_KEY];

  if (singleCache) {
    // we've only ever associated one scope with this node so let's check it
    if (matchesParent(singleCache, parentScope)) {
      return singleCache;
    }
  } else if (!node[CACHE_MULTIPLE_KEY]) {
    // no scope has ever been associated with this node
    node[CACHE_SINGLE_KEY] = self;
    return;
  }

  // looks like we have either a single scope association that was never matched or
  // multiple assocations, let's find the right one!
  return getCacheMultiple(node, parentScope, self, singleCache);
}

function matchesParent(scope, parentScope) {
  if (scope.parent === parentScope) {
    return true;
  }
}

function getCacheMultiple(node, parentScope, self, singleCache) {
  let scopes: Array<Scope> = node[CACHE_MULTIPLE_KEY] = node[CACHE_MULTIPLE_KEY] || [];

  if (singleCache) {
    // we have a scope assocation miss so push it onto our scopes
    scopes.push(singleCache);
    node[CACHE_SINGLE_KEY] = null;
  }

  // loop through and check each scope to see if it matches our parent
  for (let scope of scopes) {
    if (matchesParent(scope, parentScope)) return scope;
  }

  scopes.push(self);
}

//

let collectorVisitor = {
  For(path) {
    for (let key of (t.FOR_INIT_KEYS: Array)) {
      let declar = path.get(key);
      if (declar.isVar()) path.scope.getFunctionParent().registerBinding("var", declar);
    }
  },

  Declaration(path) {
    // delegate block scope handling to the `blockVariableVisitor`
    if (path.isBlockScoped()) return;

    // this will be hit again once we traverse into it after this iteration
    if (path.isExportDeclaration() && path.get("declaration").isDeclaration()) return;

    // we've ran into a declaration!
    path.scope.getFunctionParent().registerDeclaration(path);
  },

  ReferencedIdentifier(path, state) {
    state.references.push(path);
  },

  ForXStatement(path, state) {
    let left = path.get("left");
    if (left.isPattern() || left.isIdentifier()) {
      state.constantViolations.push(left);
    }
  },

  ExportDeclaration: {
    exit({ node, scope }) {
      let declar = node.declaration;
      if (t.isClassDeclaration(declar) || t.isFunctionDeclaration(declar)) {
        let id = declar.id;
        if (!id) return;

        let binding = scope.getBinding(id.name);
        if (binding) binding.reference();
      } else if (t.isVariableDeclaration(declar)) {
        for (let decl of (declar.declarations: Array<Object>)) {
          let ids = t.getBindingIdentifiers(decl);
          for (let name in ids) {
            let binding = scope.getBinding(name);
            if (binding) binding.reference();
          }
        }
      }
    }
  },

  LabeledStatement(path) {
    path.scope.getProgramParent().addGlobal(path.node);
    path.scope.getBlockParent().registerDeclaration(path);
  },

  AssignmentExpression(path, state) {
    state.assignments.push(path);
  },

  UpdateExpression(path, state) {
    state.constantViolations.push(path.get("argument"));
  },

  UnaryExpression(path, state) {
    if (path.node.operator === "delete") {
      state.constantViolations.push(path.get("argument"));
    }
  },

  BlockScoped(path) {
    let scope = path.scope;
    if (scope.path === path) scope = scope.parent;
    scope.getBlockParent().registerDeclaration(path);
  },

  ClassDeclaration(path) {
    let id = path.node.id;
    if (!id) return;

    let name = id.name;
    path.scope.bindings[name] = path.scope.getBinding(name);
  },

  Block(path) {
    let paths = path.get("body");
    for (let bodyPath of (paths: Array)) {
      if (bodyPath.isFunctionDeclaration()) {
        path.scope.getBlockParent().registerDeclaration(bodyPath);
      }
    }
  }
};

let uid = 0;

export default class Scope {

  /**
   * This searches the current "scope" and collects all references/bindings
   * within.
   */

  constructor(path: NodePath, parentScope?: Scope) {
    if (parentScope && parentScope.block === path.node) {
      return parentScope;
    }

    let cached = getCache(path.node, parentScope, this);
    if (cached) return cached;

    this.uid = uid++;
    this.parent = parentScope;
    this.hub    = path.hub;

    this.parentBlock = path.parent;
    this.block       = path.node;
    this.path        = path;
  }

  /**
   * Globals.
   */

  static globals = Object.keys(globals.builtin);

  /**
   * Variables available in current context.
   */

  static contextVariables = [
    "arguments",
    "undefined",
    "Infinity",
    "NaN"
  ];

  /**
   * Traverse node with current scope and path.
   */

  traverse(node: Object, opts: Object, state?) {
    traverse(node, opts, this, state, this.path);
  }

  /**
   * Generate a unique identifier and add it to the current scope.
   */

  generateDeclaredUidIdentifier(name: string = "temp") {
    let id = this.generateUidIdentifier(name);
    this.push({ id });
    return id;
  }

  /**
   * Generate a unique identifier.
   */

  generateUidIdentifier(name: string = "temp") {
    return t.identifier(this.generateUid(name));
  }

  /**
   * Generate a unique `_id1` binding.
   */

  generateUid(name: string = "temp") {
    name = t.toIdentifier(name).replace(/^_+/, "").replace(/[0-9]+$/g, "");

    let uid;
    let i = 0;
    do {
      uid = this._generateUid(name, i);
      i++;
    } while (this.hasBinding(uid) || this.hasGlobal(uid) || this.hasReference(uid));

    let program = this.getProgramParent();
    program.references[uid] = true;
    program.uids[uid] = true;

    return uid;
  }

  /**
   * Generate an `_id1`.
   */

  _generateUid(name, i) {
    let id = name;
    if (i > 1) id += i;
    return `_${id}`;
  }

  /**
   * Generate a unique identifier based on a node.
   */

  generateUidIdentifierBasedOnNode(parent: Object, defaultName?: String):  Object {
    let node = parent;

    if (t.isAssignmentExpression(parent)) {
      node = parent.left;
    } else if (t.isVariableDeclarator(parent)) {
      node = parent.id;
    } else if (t.isObjectProperty(node) || t.isObjectMethod(node)) {
      node = node.key;
    }

    let parts = [];

    let add = function (node) {
      if (t.isModuleDeclaration(node)) {
        if (node.source) {
          add(node.source);
        } else if (node.specifiers && node.specifiers.length) {
          for (let specifier of (node.specifiers: Array)) {
            add(specifier);
          }
        } else if (node.declaration) {
          add(node.declaration);
        }
      } else if (t.isModuleSpecifier(node)) {
        add(node.local);
      } else if (t.isMemberExpression(node)) {
        add(node.object);
        add(node.property);
      } else if (t.isIdentifier(node)) {
        parts.push(node.name);
      } else if (t.isLiteral(node)) {
        parts.push(node.value);
      } else if (t.isCallExpression(node)) {
        add(node.callee);
      } else if (t.isObjectExpression(node) || t.isObjectPattern(node)) {
        for (let prop of (node.properties: Array)) {
          add(prop.key || prop.argument);
        }
      }
    };

    add(node);

    let id = parts.join("$");
    id = id.replace(/^_/, "") || defaultName || "ref";

    return this.generateUidIdentifier(id.slice(0, 20));
  }

  /**
   * Determine whether evaluating the specific input `node` is a consequenceless reference. ie.
   * evaluating it wont result in potentially arbitrary code from being ran. The following are
   * whitelisted and determined not to cause side effects:
   *
   *  - `this` expressions
   *  - `super` expressions
   *  - Bound identifiers
   */

  isStatic(node: Object): boolean {
    if (t.isThisExpression(node) || t.isSuper(node)) {
      return true;
    }

    if (t.isIdentifier(node)) {
      let binding = this.getBinding(node.name);
      if (binding) {
        return binding.constant;
      } else {
        return this.hasBinding(node.name);
      }
    }

    return false;
  }

  /**
   * Possibly generate a memoised identifier if it is not static and has consequences.
   */

  maybeGenerateMemoised(node: Object, dontPush?: boolean): ?Object {
    if (this.isStatic(node)) {
      return null;
    } else {
      let id = this.generateUidIdentifierBasedOnNode(node);
      if (!dontPush) this.push({ id });
      return id;
    }
  }

  checkBlockScopedCollisions(local, kind: string, name: string, id: Object) {
    // ignore parameters
    if (kind === "param") return;

    // ignore hoisted functions if there's also a local let
    if (kind === "hoisted" && local.kind === "let") return;

    let duplicate = false;

    // don't allow duplicate bindings to exist alongside
    if (!duplicate) duplicate = kind === "let" || local.kind === "let" || local.kind === "const" || local.kind === "module";

    // don't allow a local of param with a kind of let
    if (!duplicate) duplicate = local.kind === "param" && (kind === "let" || kind === "const");

    if (duplicate) {
      throw this.hub.file.buildCodeFrameError(id, messages.get("scopeDuplicateDeclaration", name), TypeError);
    }
  }

  rename(oldName: string, newName: string, block?) {
    let binding = this.getBinding(oldName);
    if (binding) {
      newName = newName || this.generateUidIdentifier(oldName).name;
      return new Renamer(binding, oldName, newName).rename(block);
    }
  }

  _renameFromMap(map, oldName, newName, value) {
    if (map[oldName]) {
      map[newName] = value;
      map[oldName] = null;
    }
  }

  dump() {
    let sep = repeating("-", 60);
    console.log(sep);
    let scope = this;
    do {
      console.log("#", scope.block.type);
      for (let name in scope.bindings) {
        let binding = scope.bindings[name];
        console.log(" -", name, {
          constant: binding.constant,
          references: binding.references,
          violations: binding.constantViolations.length,
          kind: binding.kind
        });
      }
    } while(scope = scope.parent);
    console.log(sep);
  }

  toArray(node: Object, i?: number) {
    let file = this.hub.file;

    if (t.isIdentifier(node)) {
      let binding = this.getBinding(node.name);
      if (binding && binding.constant && binding.path.isGenericType("Array")) return node;
    }

    if (t.isArrayExpression(node)) {
      return node;
    }

    if (t.isIdentifier(node, { name: "arguments" })) {
      return t.callExpression(
        t.memberExpression(
          t.memberExpression(
            t.memberExpression(
              t.identifier("Array"),
              t.identifier("prototype")
            ),
            t.identifier("slice")
          ),
          t.identifier("call")
        ),
        [node]
      );
    }

    let helperName = "toArray";
    let args = [node];
    if (i === true) {
      helperName = "toConsumableArray";
    } else if (i) {
      args.push(t.numericLiteral(i));
      helperName = "slicedToArray";
      // TODO if (this.hub.file.isLoose("es6.forOf")) helperName += "-loose";
    }
    return t.callExpression(file.addHelper(helperName), args);
  }

  registerDeclaration(path: NodePath) {
    if (path.isLabeledStatement()) {
      this.registerBinding("label", path);
    } else if (path.isFunctionDeclaration()) {
      this.registerBinding("hoisted", path.get("id"), path);
    } else if (path.isVariableDeclaration()) {
      let declarations = path.get("declarations");
      for (let declar of (declarations: Array)) {
        this.registerBinding(path.node.kind, declar);
      }
    } else if (path.isClassDeclaration()) {
      this.registerBinding("let", path);
    } else if (path.isImportDeclaration()) {
      let specifiers = path.get("specifiers");
      for (let specifier of (specifiers: Array)) {
        this.registerBinding("module", specifier);
      }
    } else if (path.isExportDeclaration()) {
      let declar = path.get("declaration");
      if (declar.isClassDeclaration() || declar.isFunctionDeclaration() || declar.isVariableDeclaration()) {
        this.registerDeclaration(declar);
      }
    } else {
      this.registerBinding("unknown", path);
    }
  }

  buildUndefinedNode() {
    if (this.hasBinding("undefined")) {
      return t.unaryExpression("void", t.numericLiteral(0), true);
    } else {
      return t.identifier("undefined");
    }
  }

  registerConstantViolation(path: NodePath) {
    let ids = path.getBindingIdentifiers();
    for (let name in ids) {
      let binding = this.getBinding(name);
      if (binding) binding.reassign(path);
    }
  }

  registerBinding(kind: string, path: NodePath, bindingPath = path) {
    if (!kind) throw new ReferenceError("no `kind`");

    if (path.isVariableDeclaration()) {
      let declarators: Array<NodePath> = path.get("declarations");
      for (let declar of declarators) {
        this.registerBinding(kind, declar);
      }
      return;
    }

    let parent = this.getProgramParent();
    let ids = path.getBindingIdentifiers(true);

    for (let name in ids) {
      for (let id of (ids[name]: Array<Object>)) {
        let local = this.getOwnBinding(name);
        if (local) {
          // same identifier so continue safely as we're likely trying to register it
          // multiple times
          if (local.identifier === id) continue;

          this.checkBlockScopedCollisions(local, kind, name, id);
        }

        parent.references[name] = true;

        this.bindings[name] = new Binding({
          identifier: id,
          existing:   local,
          scope:      this,
          path:       bindingPath,
          kind:       kind
        });
      }
    }
  }

  addGlobal(node: Object) {
    this.globals[node.name] = node;
  }

  hasUid(name): boolean {
    let scope = this;

    do {
      if (scope.uids[name]) return true;
    } while (scope = scope.parent);

    return false;
  }

  hasGlobal(name: string): boolean {
    let scope = this;

    do {
      if (scope.globals[name]) return true;
    } while (scope = scope.parent);

    return false;
  }

  hasReference(name: string): boolean {
    let scope = this;

    do {
      if (scope.references[name]) return true;
    } while (scope = scope.parent);

    return false;
  }

  isPure(node, constantsOnly?: boolean) {
    if (t.isIdentifier(node)) {
      let binding = this.getBinding(node.name);
      if (!binding) return false;
      if (constantsOnly) return binding.constant;
      return true;
    } else if (t.isClass(node)) {
      if (node.superClass && !this.isPure(node.superClass, constantsOnly)) return false;
      return this.isPure(node.body, constantsOnly);
    } else if (t.isClassBody(node)) {
      for (let method of node.body) {
        if (!this.isPure(method, constantsOnly)) return false;
      }
      return true;
    } else if (t.isBinary(node)) {
      return this.isPure(node.left, constantsOnly) && this.isPure(node.right, constantsOnly);
    } else if (t.isArrayExpression(node)) {
      for (let elem of (node.elements: Array<Object>)) {
        if (!this.isPure(elem, constantsOnly)) return false;
      }
      return true;
    } else if (t.isObjectExpression(node)) {
      for (let prop of (node.properties: Array<Object>)) {
        if (!this.isPure(prop, constantsOnly)) return false;
      }
      return true;
    } else if (t.isClassMethod(node)) {
      if (node.computed && !this.isPure(node.key, constantsOnly)) return false;
      if (node.kind === "get" || node.kind === "set") return false;
      return true;
    } else if (t.isClassProperty(node)) {
      if (node.computed && !this.isPure(node.key, constantsOnly)) return false;
      return this.isPure(node.value, constantsOnly);
    } else {
      return t.isPureish(node);
    }
  }

  /**
   * Set some arbitrary data on the current scope.
   */

  setData(key, val) {
    return this.data[key] = val;
  }

  /**
   * Recursively walk up scope tree looking for the data `key`.
   */

  getData(key) {
    let scope = this;
    do {
      let data = scope.data[key];
      if (data != null) return data;
    } while(scope = scope.parent);
  }

  /**
   * Recursively walk up scope tree looking for the data `key` and if it exists,
   * remove it.
   */

  removeData(key) {
    let scope = this;
    do {
      let data = scope.data[key];
      if (data != null) scope.data[key] = null;
    } while(scope = scope.parent);
  }

  init() {
    if (!this.references) this.crawl();
  }

  crawl() {
    let path = this.path;

    //

    this.references = Object.create(null);
    this.bindings   = Object.create(null);
    this.globals    = Object.create(null);
    this.uids       = Object.create(null);
    this.data       = Object.create(null);

    // ForStatement - left, init

    if (path.isLoop()) {
      for (let key of (t.FOR_INIT_KEYS: Array<string>)) {
        let node = path.get(key);
        if (node.isBlockScoped()) this.registerBinding(node.node.kind, node);
      }
    }

    // FunctionExpression - id

    if (path.isFunctionExpression() && path.has("id")) {
      this.registerBinding("local", path.get("id"), path);
    }

    // Class

    if (path.isClassExpression() && path.has("id")) {
      this.registerBinding("local", path);
    }

    // Function - params, rest

    if (path.isFunction()) {
      let params: Array<NodePath> = path.get("params");
      for (let param of params) {
        this.registerBinding("param", param);
      }
    }

    // CatchClause - param

    if (path.isCatchClause()) {
      this.registerBinding("let", path);
    }

    // Program

    let parent = this.getProgramParent();
    if (parent.crawling) return;

    let state = {
      references: [],
      constantViolations: [],
      assignments: [],
    };

    this.crawling = true;
    path.traverse(collectorVisitor, state);
    this.crawling = false;

    // register assignments
    for (let path of state.assignments) {
      // register undeclared bindings as globals
      let ids = path.getBindingIdentifiers();
      let programParent;
      for (let name in ids) {
        if (path.scope.getBinding(name)) continue;

        programParent = programParent ||  path.scope.getProgramParent();
        programParent.addGlobal(ids[name]);
      }

      // register as constant violation
      path.scope.registerConstantViolation(path);
    }

    // register references
    for (let ref of state.references) {
      let binding = ref.scope.getBinding(ref.node.name);
      if (binding) {
        binding.reference(ref);
      } else {
        ref.scope.getProgramParent().addGlobal(ref.node);
      }
    }

    // register constant violations
    for (let path of state.constantViolations) {
      path.scope.registerConstantViolation(path);
    }
  }

  push(opts: {
    id: Object;
    init: ?Object;
    unique: ?boolean;
    _blockHoist: ?number;
    kind: "var" | "let";
  }) {
    let path = this.path;

    if (path.isSwitchStatement()) {
      path = this.getFunctionParent().path;
    }

    if (path.isLoop() || path.isCatchClause() || path.isFunction()) {
      t.ensureBlock(path.node);
      path = path.get("body");
    }

    if (!path.isBlockStatement() && !path.isProgram()) {
      path = this.getBlockParent().path;
    }

    let unique = opts.unique;
    let kind   = opts.kind || "var";
    let blockHoist = opts._blockHoist == null ? 2 : opts._blockHoist;

    let dataKey = `declaration:${kind}:${blockHoist}`;
    let declarPath  = !unique && path.getData(dataKey);

    if (!declarPath) {
      let declar = t.variableDeclaration(kind, []);
      declar._generated = true;
      declar._blockHoist = blockHoist;

      [declarPath] = path.unshiftContainer("body", [declar]);
      if (!unique) path.setData(dataKey, declarPath);
    }

    let declarator = t.variableDeclarator(opts.id, opts.init);
    declarPath.node.declarations.push(declarator);
    this.registerBinding(kind, declarPath.get("declarations").pop());
  }

  /**
   * Walk up to the top of the scope tree and get the `Program`.
   */

  getProgramParent() {
    let scope = this;
    do {
      if (scope.path.isProgram()) {
        return scope;
      }
    } while (scope = scope.parent);
    throw new Error("We couldn't find a Function or Program...");
  }

  /**
   * Walk up the scope tree until we hit either a Function or reach the
   * very top and hit Program.
   */

  getFunctionParent() {
    let scope = this;
    do {
      if (scope.path.isFunctionParent()) {
        return scope;
      }
    } while (scope = scope.parent);
    throw new Error("We couldn't find a Function or Program...");
  }

  /**
   * Walk up the scope tree until we hit either a BlockStatement/Loop/Program/Function/Switch or reach the
   * very top and hit Program.
   */

  getBlockParent() {
    let scope = this;
    do {
      if (scope.path.isBlockParent()) {
        return scope;
      }
    } while (scope = scope.parent);
    throw new Error("We couldn't find a BlockStatement, For, Switch, Function, Loop or Program...");
  }

  /**
   * Walks the scope tree and gathers **all** bindings.
   */

  getAllBindings(): Object {
    let ids = Object.create(null);

    let scope = this;
    do {
      defaults(ids, scope.bindings);
      scope = scope.parent;
    } while (scope);

    return ids;
  }

  /**
   * Walks the scope tree and gathers all declarations of `kind`.
   */

  getAllBindingsOfKind(): Object {
    let ids = Object.create(null);

    for (let kind of (arguments: Array)) {
      let scope = this;
      do {
        for (let name in scope.bindings) {
          let binding = scope.bindings[name];
          if (binding.kind === kind) ids[name] = binding;
        }
        scope = scope.parent;
      } while (scope);
    }

    return ids;
  }

  bindingIdentifierEquals(name: string, node: Object): boolean {
    return this.getBindingIdentifier(name) === node;
  }

  getBinding(name: string) {
    let scope = this;

    do {
      let binding = scope.getOwnBinding(name);
      if (binding) return binding;
    } while (scope = scope.parent);
  }

  getOwnBinding(name: string) {
    return this.bindings[name];
  }

  getBindingIdentifier(name: string) {
    let info = this.getBinding(name);
    return info && info.identifier;
  }

  getOwnBindingIdentifier(name: string) {
    let binding = this.bindings[name];
    return binding && binding.identifier;
  }

  hasOwnBinding(name: string) {
    return !!this.getOwnBinding(name);
  }

  hasBinding(name: string, noGlobals?) {
    if (!name) return false;
    if (this.hasOwnBinding(name)) return true;
    if (this.parentHasBinding(name, noGlobals)) return true;
    if (this.hasUid(name)) return true;
    if (!noGlobals && includes(Scope.globals, name)) return true;
    if (!noGlobals && includes(Scope.contextVariables, name)) return true;
    return false;
  }

  parentHasBinding(name: string, noGlobals?) {
    return this.parent && this.parent.hasBinding(name, noGlobals);
  }

  /**
   * Move a binding of `name` to another `scope`.
   */

  moveBindingTo(name, scope) {
    let info = this.getBinding(name);
    if (info) {
      info.scope.removeOwnBinding(name);
      info.scope = scope;
      scope.bindings[name] = info;
    }
  }

  removeOwnBinding(name: string) {
    delete this.bindings[name];
  }

  removeBinding(name: string) {
    // clear literal binding
    let info = this.getBinding(name);
    if (info) {
      info.scope.removeOwnBinding(name);
    }

    // clear uids with this name - https://github.com/babel/babel/issues/2101
    let scope = this;
    do {
      if (scope.uids[name]) {
        scope.uids[name] = false;
      }
    } while(scope = scope.parent);
  }
}
