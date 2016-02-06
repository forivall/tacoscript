/* @noflow */
/* global FileMetadata */

import getHelper from "babel-helpers";
import * as metadataVisitor from "./metadata";
import convertSourceMap from "convert-source-map";
import shebangRegex from "shebang-regex";
import traverse, { NodePath, Hub, Scope } from "comal-traverse";
import sourceMap from "source-map";
import Store from "../store";
import path from "path";
import * as t from "comal-types";

let errorVisitor = {
  enter(path, state) {
    let loc = path.node.loc;
    if (loc) {
      state.loc = loc;
      path.stop();
    }
  }
};

export default class File {
  constructor(opts) {
    this.store = new Store();

    this.opts = {
      sourceMaps: opts.sourceMaps || !!opts.inputSourceMap,
      moduleIds: opts.moduleIds || opts.moduleId != null,
    };

    this.moduleId = opts.moduleId;
    this.moduleRoot = opts.moduleRoot;
    this.sourceRoot = opts.sourceRoot;

    this.filename = opts.filename;
    this.basename = path.basename(opts.filename, path.extname(opts.filename));

    let basenameRelative = path.basename(opts.filenameRelative);

    this.sourceFileName = opts.sourceFileName || basenameRelative;
    this.sourceMapTarget = opts.sourceMapTarget || basenameRelative;

    this.inputSourceMap = opts.inputSourceMap;

    //

    this.metadata = {
      usedHelpers: [],
      marked: [],
      modules: {
        imports: [],
        exports: {
          exported: [],
          specifiers: []
        }
      }
    };

    this.dynamicImportTypes = {};
    this.dynamicImportIds   = {};
    this.dynamicImports     = [];
    this.declarations       = {};
    this.usedHelpers        = {};

    this.path = null;
    this.ast  = {};

    this.code    = "";
    this.shebang = "";

    this.hub = new Hub(this);
  }

  static helpers: Array<string>;

  opts: {
    sourceMaps: boolean,
    moduleIds: boolean
  };
  moduleId: string;
  moduleRoot: string;
  sourceRoot: string;
  filename: string;
  basename: string;
  sourceFileName: string;
  sourceMapTarget: string;
  inputSourceMap: Object;

  metadata: FileMetadata;
  dynamicImportTypes: Object;
  dynamicImportIds: Object;
  dynamicImports: Array<Object>;
  declarations: Object;
  usedHelpers: Object;
  path: NodePath;
  ast: Object;
  scope: Scope;
  hub: Hub;
  code: string;
  shebang: string;

  // proxy store
  get(key) { return this.store.get(key); }
  set(key, value) { return this.store.set(key, value); }
  setDynamic(key, value) { return this.store.setDynamic(key, value); }

  getMetadata() {
    let has = false;
    for (let node of (this.ast.program.body: Array<Object>)) {
      if (t.isModuleDeclaration(node)) {
        has = true;
        break;
      }
    }
    if (has) {
      this.path.traverse(metadataVisitor, this);
    }
  }

  getModuleName(getModuleId: ?Function): ?string {
    if (!this.opts.moduleIds) {
      return null;
    }

    // moduleId is n/a if a `getModuleId()` is provided
    if (this.moduleId != null && !getModuleId) {
      return this.moduleId;
    }

    let filenameRelative = this.filename;
    let moduleName = "";

    if (this.moduleRoot != null) {
      moduleName = this.moduleRoot + "/";
    }

    if (this.sourceRoot != null) {
      // remove sourceRoot from filename
      let sourceRootRegEx = new RegExp("^" + this.sourceRoot + "\/?");
      filenameRelative = filenameRelative.replace(sourceRootRegEx, "");
    }

    // remove extension
    filenameRelative = filenameRelative.replace(/\.(\w*?)$/, "");

    moduleName += filenameRelative;

    // normalize path separators
    moduleName = moduleName.replace(/\\/g, "/");

    if (getModuleId) {
      // If return is falsy, assume they want us to use our generated default name
      return getModuleId(moduleName) || moduleName;
    } else {
      return moduleName;
    }
  }

  setAst(ast) {
    this.path = NodePath.get({
      hub: this.hub,
      parentPath: null,
      parent: ast,
      container: ast,
      key: "program"
    }).setContext();
    this.scope = this.path.scope;
    this.ast   = ast;
    this.getMetadata();
  }

  setCode(code: string) {
    code = (code || "") + "";
    if (this.opts.sourceMaps) {
      code = this.parseInputSourceMap(code);
    }
    this.code = code;

    this.parseShebang();
  }

  parseInputSourceMap(code): string {
    let inputMap = convertSourceMap.fromSource(code);
    if (inputMap) {
      this.inputSourceMap = inputMap.toObject();
      code = convertSourceMap.removeComments(code);
    }
    return code;
  }

  parseShebang() {
    let shebangMatch = shebangRegex.exec(this.code);
    if (shebangMatch) {
      this.shebang = shebangMatch[0];
      this.code = this.code.replace(shebangRegex, "");
    }
  }

  mergeSourceMap(map: Object) {
    let inputMap = this.inputSourceMap;

    if (inputMap) {
      let inputMapConsumer   = new sourceMap.SourceMapConsumer(inputMap);
      let outputMapConsumer  = new sourceMap.SourceMapConsumer(map);

      let mergedGenerator = new sourceMap.SourceMapGenerator({
        file: inputMapConsumer.file,
        sourceRoot: inputMapConsumer.sourceRoot
      });

      // This assumes the output map always has a single source, since Babel always compiles a single source file to a
      // single output file.
      const source = outputMapConsumer.sources[0];

      inputMapConsumer.eachMapping(function (mapping) {
        const generatedPosition = outputMapConsumer.generatedPositionFor({
          line: mapping.generatedLine,
          column: mapping.generatedColumn,
          source: source
        });
        if (generatedPosition.column != null) {
          mergedGenerator.addMapping({
            source: mapping.source,

            original: {
              line: mapping.originalLine,
              column: mapping.originalColumn
            },

            generated: generatedPosition
          });
        }
      });

      let mergedMap = mergedGenerator.toJSON();
      inputMap.mappings = mergedMap.mappings;
      return inputMap;
    } else {
      return map;
    }
  }

  resolveModuleSource(source: string): string {
    let resolveModuleSource = this.opts.resolveModuleSource;
    if (resolveModuleSource) source = resolveModuleSource(source, this.opts.filename);
    return source;
  }

  addImport(source: string, imported: string, name?: string = imported): Object {
    let alias = `${source}:${imported}`;
    let id = this.dynamicImportIds[alias];

    if (!id) {
      source = this.resolveModuleSource(source);
      id = this.dynamicImportIds[alias] = this.scope.generateUidIdentifier(name);

      let specifiers = [];

      if (imported === "*") {
        specifiers.push(t.importNamespaceSpecifier(id));
      } else if (imported === "default") {
        specifiers.push(t.importDefaultSpecifier(id));
      } else {
        specifiers.push(t.importSpecifier(id, t.identifier(imported)));
      }

      let declar = t.importDeclaration(specifiers, t.stringLiteral(source));
      declar._blockHoist = 3;

      this.path.unshiftContainer("body", declar);
    }

    return id;
  }

  addHelper(name: string): Object {
    let declar = this.declarations[name];
    if (declar) return declar;

    if (!this.usedHelpers[name]) {
      this.metadata.usedHelpers.push(name);
      this.usedHelpers[name] = true;
    }

    let generator = this.store.get("helperGenerator");
    let runtime   = this.store.get("helpersNamespace");
    if (generator) {
      let res = generator(name);
      if (res) return res;
    } else if (runtime) {
      return t.memberExpression(runtime, t.identifier(name));
    }

    let ref = getHelper(name);
    let uid = this.declarations[name] = this.scope.generateUidIdentifier(name);

    if (t.isFunctionExpression(ref) && !ref.id) {
      ref.body._compact = true;
      ref._generated = true;
      ref.id = uid;
      ref.type = "FunctionDeclaration";
      this.path.unshiftContainer("body", ref);
    } else {
      ref._compact = true;
      this.scope.push({
        id: uid,
        init: ref,
        unique: true
      });
    }

    return uid;
  }

  addTemplateObject(
    helperName: string,
    strings: Array<Object>,
    raw: Object,
  ): Object {
    // Generate a unique name based on the string literals so we dedupe
    // identical strings used in the program.
    let stringIds = raw.elements.map(function(string) {
      return string.value;
    });
    let name = `${helperName}_${raw.elements.length}_${stringIds.join(",")}`;

    let declar = this.declarations[name];
    if (declar) return declar;

    let uid = this.declarations[name] = this.scope.generateUidIdentifier("templateObject");

    let helperId = this.addHelper(helperName);
    let init = t.callExpression(helperId, [strings, raw]);
    init._compact = true;
    this.scope.push({
      id: uid,
      init: init,
      _blockHoist: 1.9    // This ensures that we don't fail if not using function expression helpers
    });
    return uid;
  }

  buildCodeFrameError(node: Object, msg: string, Error: typeof Error = SyntaxError): Error {
    let loc = node && (node.loc || node._loc);

    let err = new Error(msg);

    if (loc) {
      err.loc = loc.start;
    } else {
      traverse(node, errorVisitor, this.scope, err);

      err.message += " (This is an error on an internal node. Probably an internal error";

      if (err.loc) {
        err.message += ". Location has been estimated.";
      }

      err.message += ")";
    }

    return err
  }
}
