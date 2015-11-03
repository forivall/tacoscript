let emptyObject = {};

export const defaultOptions = {
  // The two source types have different static semantics.
  // The added "expression" source type is like wrapping a script in parenthises,
  // and allows return outside of functions
  sourceType: "module", // or "script" (todo), or "expression" (todo)

  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,

  // map of plugins with their options
  plugins: emptyObject,

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

  createParenthesizedExpressionNodes: false
  // TODO: callbacks will be only added via plugin
}

// Interpret and default an options object

export function getOptions(opts) {
  let options = {};
  for (let key in defaultOptions) {
    options[key] = opts && key in opts ? opts[key] : defaultOptions[key];
    // dalways init a new empty object
    if (options[key] === emptyObject) options[key] = {};
  }
  return options;
}
