require('source-map-support').install();

var sourceMap = require("source-map");
var assert = require("chai").assert;
var Plugin = require("../lib/transformation/plugin").default;

var api = require("./_babel_api");

function assertIgnored(result) {
  assert.ok(result.ignored);
}

function assertNotIgnored(result) {
  assert.ok(!result.ignored);
}

// shim
function transformAsync(code, opts) {
  return {
    then: function (resolve) {
      resolve(api.transform(code, opts));
    }
  };
}

suite("api", function () {

  test("transformFile", function (done) {
    api.transformFile(__dirname + "/fixtures/api/file.js", {}, function (err, res) {
      if (err) return done(err);
      assert.equal(res.code, "foo();");
      done();
    });
  });

  test("transformFileSync", function () {
    assert.equal(api.transformFileSync(__dirname + "/fixtures/api/file.js", {}).code, "foo();");
  });

  test("options merge backwards", function () {
    return transformAsync("", {
      presets: [__dirname + "/node_modules/babel-preset-es2015"],
      plugins: [__dirname + "/node_modules/babel-plugin-syntax-jsx"]
    }).then(function (result) {
      assert.ok(result.options.plugins[0][0].manipulateOptions.toString().indexOf("jsx") >= 0);
    });
  });

  function execPassPerPresetTest(passPerPreset) {
    var aliasBaseType = null;
    var ast = api.transform('type Foo = number; let x = (y): Foo => y;', {
      passPerPreset: passPerPreset,
      presets: [
        // First preset with our plugin, "before"
        {
          plugins: [
            new Plugin({
              visitor: {
                Function: function(path) {
                  var alias = path.scope.getProgramParent().path.get('body')[0].node;
                  if (!api.types.isTypeAlias(alias)) return;

                  // In case of `passPerPreset` being `false`, the
                  // alias node is already removed by Flow plugin.
                  if (!alias) {
                    return;
                  }

                  // In case of `passPerPreset` being `true`, the
                  // alias node should still exist.
                  aliasBaseType = alias.right.type; // NumberTypeAnnotation
                }
              }
            })
          ]
        },

        // ES2015 preset
        require(__dirname + "/node_modules/babel-preset-es2015"),

        // Third preset for Flow.
        {
          plugins: [
            require(__dirname + "/node_modules/babel-plugin-syntax-flow"),
            require(__dirname + "/node_modules/babel-plugin-transform-flow-strip-types"),
          ]
        }
      ],
    });
    return {
      ast: ast,
      aliasBaseType: aliasBaseType
    }
  }

  test("pass per preset on", function () {
    // 1. passPerPreset: true

    var result = execPassPerPresetTest(true);

    assert.equal(result.aliasBaseType, "NumberTypeAnnotation");

    assert.deepEqual([
      '"use strict";',
      '',
      'var x = function x(y) {',
      '  return y;',
      '};'
    ].join("\n"), result.ast.code);

  });

  test("pass per preset off", function () {
    // 2. passPerPreset: false
    var result = execPassPerPresetTest(false);

    assert.equal(result.aliasBaseType, null);

    assert.deepEqual([
      '"use strict";',
      '',
      'var x = function x(y) {',
      '  return y;',
      '};'
    ].join("\n"), result.ast.code);

  });

  test("source map merging", function () {
    var result = api.transform([
      'function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }',
      '',
      'let Foo = function Foo() {',
      '  _classCallCheck(this, Foo);',
      '};',
      '',
      '//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0ZG91dCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztJQUFNLEdBQUcsWUFBSCxHQUFHO3dCQUFILEdBQUciLCJmaWxlIjoidW5kZWZpbmVkIiwic291cmNlc0NvbnRlbnQiOlsiY2xhc3MgRm9vIHt9XG4iXX0='
    ].join("\n"), {
      sourceMap: true
    });

    assert.deepEqual([
      "function _classCallCheck(instance, Constructor) {",
      "  if (!(instance instanceof Constructor)) {",
      '    throw new TypeError("Cannot call a class as a function");',
      "  }",
      "}",
      "",
      "let Foo = function Foo() {",
      "  _classCallCheck(this, Foo);",
      "};"
    ].join("\n"), result.code);

    var consumer = new sourceMap.SourceMapConsumer(result.map);

    assert.deepEqual(consumer.originalPositionFor({
      line: 7,
      column: 4
    }), {
      name: null,
      source: "stdout",
      line: 1,
      column: 6
    });
  });

  test("code option false", function () {
    return transformAsync("foo('bar');", { code: false }).then(function (result) {
      assert.ok(!result.code);
    });
  });

  test("ast option false", function () {
    return transformAsync("foo('bar');", { ast: false }).then(function (result) {
      assert.ok(!result.ast);
    });
  });

  test("auxiliaryComment option", function () {
    return transformAsync("class Foo {}", {
      auxiliaryCommentBefore: "before",
      auxiliaryCommentAfter: "after",
      plugins: [function (api) {
        var t = api.types;
        return {
          visitor: {
            Program: function (path) {
              path.unshiftContainer("body", t.expressionStatement(t.identifier("start")));
              path.pushContainer("body", t.expressionStatement(t.identifier("end")));
            }
          }
        };
      }]
    }).then(function (result) {
      assert.equal(result.code, "/*before*/start;\n/*after*/class Foo {}\n/*before*/end;\n/*after*/");
    });
  });

  suite("modules metadata", function () {
    test("import as", function() {
      return transformAsync('import { externalName as localName } from "external";').then(function (result) {
        assert.deepEqual(result.metadata.modules.imports[0], {
          source: "external",
          imported: ["externalName"],
          specifiers: [{
            kind: "named",
            imported: "externalName",
            local: "localName"
          }]
        });
      });
    });

    test("import *", function() {
      return transformAsync('import * as localName2 from "external";').then(function (result) {
        assert.deepEqual(result.metadata.modules.imports[0], {
          source: "external",
          imported: ["*"],
          specifiers: [{
            kind: "namespace",
            local: "localName2"
          }]
        });
      });
    });

    test("import default", function() {
      return transformAsync('import localName3 from "external";').then(function (result) {
        assert.deepEqual(result.metadata.modules.imports[0], {
          source: "external",
          imported: ["default"],
          specifiers: [{
            kind: "named",
            imported: "default",
            local: "localName3"
          }]
        });
      });
    });

    test("import resolve", function() {
      return transformAsync('import localName from "./array";', {
        resolveModuleSource: function() {
          return "override-source";
        }
      }).then(function (result) {
        assert.deepEqual(result.metadata.modules.imports, [
          {
            source: "override-source",
            imported: ["default"],
            specifiers: [
              {
                "kind": "named",
                "imported": "default",
                "local": "localName"
              }
            ]
          }
        ]);
      });
    });

    test("export extensions star", function() {
      return transformAsync('export * as externalName1 from "external";', {
        plugins: [require("babel-plugin-syntax-export-extensions")]
      }).then(function (result) {
         assert.deepEqual(result.metadata.modules.exports, {
          exported: ['externalName1'],
          specifiers: [{
            kind: "external-namespace",
            exported: "externalName1",
            source: "external",
          }]
        });
      });
    });

    test("export extensions default", function() {
      return transformAsync('export externalName2 from "external";', {
        plugins: [require("babel-plugin-syntax-export-extensions")]
      }).then(function (result) {
        assert.deepEqual(result.metadata.modules.exports, {
          exported: ["externalName2"],
          specifiers: [{
            kind: "external",
            local: "externalName2",
            exported: "externalName2",
            source: "external"
          }]
        });
      });
    });

    test("export function", function() {
      return transformAsync('export function namedFunction() {}').then(function (result) {
        assert.deepEqual(result.metadata.modules.exports, {
          exported: ["namedFunction"],
          specifiers: [{
            kind: "local",
            local: "namedFunction",
            exported: "namedFunction"
          }]
        });
      });
    });

    test("base", function() {
      return transformAsync('export var foo = "bar";').then(function (result) {
        assert.deepEqual(result.metadata.modules.exports, {
          "exported": ["foo"],
          specifiers: [{
            kind: "local",
            local: "foo",
            exported: "foo"
          }]
        });
      });
    });

    test("base", function() {
      return transformAsync("export { localName as externalName3 };").then(function (result) {
        assert.deepEqual(result.metadata.modules.exports, {
          exported: ["externalName3"],
          specifiers: [{
            kind: "local",
            local: "localName",
            exported: "externalName3"
          }]
        });
      });
    });

    test("base", function() {
      return transformAsync('export { externalName4 } from "external";').then(function (result) {
        assert.deepEqual(result.metadata.modules.exports, {
          exported: ["externalName4"],
          specifiers: [{
            kind: "external",
            local: "externalName4",
            exported: "externalName4",
            source: "external"
          }]
        });
      });
    });

    test("base", function() {
      return transformAsync('export * from "external";').then(function (result) {
        assert.deepEqual(result.metadata.modules.exports, {
          exported: [],
          specifiers: [{
            kind: "external-all",
            source: "external"
          }]
        });
      });
    });

    test("base", function() {
      return transformAsync("export default function defaultFunction() {}").then(function (result) {
        assert.deepEqual(result.metadata.modules.exports, {
          exported: ["defaultFunction"],
          specifiers: [{
            kind: "local",
            local: "defaultFunction",
            exported: "default"
          }]
        });
      });
    });
  });

  test("ignore option", function () {
    return Promise.all([
      transformAsync("", {
        ignore: "node_modules",
        filename: "/foo/node_modules/bar"
      }).then(assertIgnored),

      transformAsync("", {
        ignore: "foo/node_modules",
        filename: "/foo/node_modules/bar"
      }).then(assertIgnored),

      transformAsync("", {
        ignore: "foo/node_modules/*.bar",
        filename: "/foo/node_modules/foo.bar"
      }).then(assertIgnored)
    ]);
  });

  test("only option", function () {
    return Promise.all([
      transformAsync("", {
        only: "node_modules",
        filename: "/foo/node_modules/bar"
      }).then(assertNotIgnored),

      transformAsync("", {
        only: "foo/node_modules",
        filename: "/foo/node_modules/bar"
      }).then(assertNotIgnored),

      transformAsync("", {
        only: "foo/node_modules/*.bar",
        filename: "/foo/node_modules/foo.bar"
      }).then(assertNotIgnored),

      transformAsync("", {
        only: "node_modules",
        filename: "/foo/node_module/bar"
      }).then(assertIgnored),

      transformAsync("", {
        only: "foo/node_modules",
        filename: "/bar/node_modules/foo"
      }).then(assertIgnored),

      transformAsync("", {
        only: "foo/node_modules/*.bar",
        filename: "/foo/node_modules/bar.foo"
      }).then(assertIgnored)
    ])
  });

  suite("env option", function () {
    var oldBabelEnv = process.env.BABEL_ENV;
    var oldNodeEnv = process.env.NODE_ENV;

    before(function () {
      delete process.env.BABEL_ENV;
      delete process.env.NODE_ENV;
    });

    after(function () {
      process.env.BABEL_ENV = oldBabelEnv;
      process.env.NODE_ENV = oldNodeEnv;
    });

    test("default", function () {
      return transformAsync("foo;", {
        env: {
          development: { code: false }
        }
      }).then(function (result) {
        assert.equal(result.code, undefined);
      });
    });

    test("BABEL_ENV", function () {
      process.env.BABEL_ENV = "foo";
      return transformAsync("foo;", {
        env: {
          foo: { code: false }
        }
      }).then(function (result) {
        assert.equal(result.code, undefined);
      });
    });

    test("NODE_ENV", function () {
      process.env.NODE_ENV = "foo";
      return transformAsync("foo;", {
        env: {
          foo: { code: false }
        }
      }).then(function (result) {
        assert.equal(result.code, undefined);
      });
    });
  });

  test("resolveModuleSource option", function () {
    var actual = 'import foo from "foo-import-default";\nimport "foo-import-bare";\nexport { foo } from "foo-export-named";';
    var expected = 'import foo from "resolved/foo-import-default";\nimport "resolved/foo-import-bare";\nexport { foo } from "resolved/foo-export-named";';

    return transformAsync(actual, {
      resolveModuleSource: function (originalSource) {
        return "resolved/" + originalSource;
      }
    }).then(function (result) {
      assert.equal(result.code.trim(), expected);
    });
  });

});
