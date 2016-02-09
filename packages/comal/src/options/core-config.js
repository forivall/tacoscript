import fileConfig from "./file-config";

export default {
  ...fileConfig,

  // babel-code-frame
  highlightCode: {
    description: "enable/disable ANSI syntax highlighting of code frames (on by default)",
    type: "boolean",
    default: true
  },

  suppressDeprecationMessages: {
    type: "boolean",
    default: false,
    hidden: true
  },

  resolveModuleSource: {
    hidden: true
  },

  getModuleId: {
    hidden: true
  },

  passPerPreset: {
    description: "Whether to spawn a traversal pass per a preset. By default all presets are merged.",
    type: "boolean",
    default: false,
    hidden: true,
  },

  // toggles if code should be generated. Alternatively, meta should just not
  // include a generator
  code: {
    hidden: true,
    default: true,
    type: "boolean"
  },
};
