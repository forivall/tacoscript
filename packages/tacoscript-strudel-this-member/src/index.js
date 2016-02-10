
// Warning: this plugin signature may change significantly before 1.0

export default function (api) {
  return {
    visitor: {
      ThisMemberExpression(path, state) {
        // access opts at state.opts
      }
    },
    desugar: {

    },
    manipulateOptions(opts, parserOpts) {
      parserOpts.features.push("strudelThisMember");
    },
    // parse
    // generate
  };
}
