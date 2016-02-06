// TODO: add a target: Array<string> property
// to automatically split out options that should go to the generator, parser, etc.
// then move these options into their appropriate location

// rearchitect to use nested options like browserify

module.exports = {
  filename: {
    type: "filename",
    description: "filename to use when reading from stdin - this will be used in source-maps, errors etc",
    default: "unknown",
    shorthand: "f"
  },

  env: {
    hidden: true,
    default: {}
  },

  mode: {
    description: "",
    hidden: true
  },

  presets: {
    type: "list",
    description: "",
    default: []
  },

  plugins: {
    type: "list",
    default: [],
    description: ""
  },

  ignore: {
    type: "list",
    description: "list of glob paths to **not** compile",
    default: []
  },

  only: {
    type: "list",
    description: "list of glob paths to **only** compile"
  },

  code: {
    hidden: true,
    default: true,
    type: "boolean"
  },

  metadata: {
    hidden: true,
    default: true,
    type: "boolean"
  },

  ast: {
    hidden: true,
    default: true,
    type: "boolean"
  },

  extends: {
    type: "string",
    hidden: true
  },


  babelrc: {
    description: "Whether or not to look up .babelrc and .babelignore files",
    type: "boolean",
    default: true
  },

  sourceType: {
    description: "",
    default: "module"
  },

  /// GENERATOR
  retainLines: {
    type: "boolean",
    default: false,
    description: "retain line numbers - will result in really ugly code"
  },

  comments: {
    type: "boolean",
    default: true,
    description: "write comments to generated output (true by default)"
  },

  shouldPrintComment: {
    hidden: true,
    description: "optional callback to control whether a comment should be inserted, when this is used the comments option is ignored"
  },

  compact: {
    type: "booleanString",
    default: "auto",
    description: "do not include superfluous whitespace characters and line terminators [true|false|auto]"
  },

  minified: {
    type: "boolean",
    default: false,
    description: "save as much bytes when printing [true|false]"
  },

  auxiliaryCommentBefore: {
    type: "string",
    description: "print a comment before any injected non-user code"
  },

  auxiliaryCommentAfter: {
    type: "string",
    description: "print a comment after any injected non-user code"
  },

};
