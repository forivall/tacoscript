// TODO: move into `tacoscript` package

import fileConfig from "./file-config";

export default babelGeneratorConfig;
const babelGeneratorConfig = {
  filename: fileConfig.filename,

  sourceMap: fileConfig.sourceMap,
  sourceMaps: fileConfig.sourceMaps,
  sourceMapTarget: fileConfig.sourceMapTarget,
  sourceFileName: fileConfig.sourceFileName,
  sourceRoot: fileConfig.sourceRoot,

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

  concise: {
    type: "boolean",
    default: false,
    description: "reduce whitespace (but not as much as `compact`)"
  },

  quotes: {
    type: "string",
    default: null,
    description: "The type of quote to use in the output. Autodetected by default"
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
