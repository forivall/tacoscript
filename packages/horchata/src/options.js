let emptyObject = {};

export const defaultOptions = {
  // The two source types have different static semantics.
  // The added "expression" source type is like wrapping a script in parenthises,
  // and allows return outside of functions
  sourceType: "module", // or "script" (todo), or "expression" (todo)

  // When enabled, a return at the top level is not considered an
  // error.
  // TODO: rename to allow return in any statement context, same with super
  // TODO: actually, just move to validator plugins.
  allowReturnOutsideFunction: false,

  // When enabled, `super` is allowed anywhere.
  allowSuperOutsideMethod: false,

  // When enabled, `new.target` is allowed anywhere.
  allowNewTargetOutsideFunction: false,

  // map of plugins with their options
  plugins: emptyObject,

  // Construct a CST with the sourceElements, according to the estree CST proposal spec
  // https://github.com/gibson042/estree/blob/gh-41/spec.md
  sourceElements: true,


  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: true,

  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,

  createParenthesizedExpressionNodes: false,

  // When enabled, import/export statements are not constrained to
  // appearing at the top level of the program.
  allowImportExportEverywhere: false,

  // When emabled, leading strings at the top level are parsed as
  // expression statements and not directives
  noTopLevelDirectives: false,


  // When enabled, allows the creation of arrow function generators.
  // These cannot be directly expressed in vanilla es2015+, however
  // babel transforms them properly into es5 and older.
  allowArrowFunctionGenerators: false,

  // Features, for simple parsing extensions needed for foundational plugins

  features: {
    exclCall: true,
    statementNoParenCall: false,
    implicitReturnFunctions: false,
    lexicallyBoundNamedFunctions: false,
    strudelThisMember: false,
    externDeclarations: false,
  },

  // TODO: callbacks will be only added via plugin

  // TODO: create a `loose` preset that allows all of these "allowSomethingSomewhere"

  // TODO: https://github.com/jmeas/sourcemap-options
}

// Interpret and default an options object

export function getOptions(opts) {
  return _getOptions(opts, defaultOptions);
}

function _getOptions(opts, spec) {
  let options = {};
  for (let key in spec) {
    if (spec[key] !== null && typeof spec[key] === "object") {
      if (spec[key] === emptyObject) {
        options[key] = opts[key] || {};
      } else {
        options[key] = _getOptions(opts[key] || {}, spec[key]);
      }
    } else {
      options[key] = opts && key in opts ? opts[key] : spec[key];
    }
  }
  return options;
}
