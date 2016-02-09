
export default {

  filename: {
    type: "filename",
    description: "filename used in source-maps, errors etc",
    default: "unknown",
    shorthand: "f"
  },

  sourceMap: {
    alias: "sourceMaps",
    hidden: true
  },

  sourceMaps: {
    type: "booleanString",
    description: "[true|false|inline]",
    default: false,
    shorthand: "s"
  },

  sourceMapTarget: {
    type: "string",
    description: "set `file` on returned source map"
  },

  sourceFileName: {
    type: "string",
    description: "set `sources[0]` on returned source map"
  },

  sourceRoot: {
    type: "filename",
    description: "the root from which all sources are relative"
  },

  moduleRoot: {
    type: "filename",
    description: "optional prefix for the AMD module formatter that will be prepend to the filename on module definitions"
  },

  moduleIds: {
    type: "boolean",
    default: false,
    shorthand: "M",
    description: "insert an explicit id for modules"
  },

  moduleId: {
    description: "specify a custom name for module ids",
    type: "string"
  },

  // see tests for usage
  resolveModuleSource: {
    hidden: true
  },
}
