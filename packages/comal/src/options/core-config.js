import fileConfig from "./file-config";

export default coreConfig;

const coreConfig = {
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
};
