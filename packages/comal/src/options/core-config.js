import fileConfig from "./file-config";

export default {
  ...fileConfig,

  // environment variables
  env: {
    hidden: true,
    default: {}
  },

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

  getModuleId: {
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

  generatorPlugins: {
    type: "list",
    default: [],
    description: ""
  },

  passPerPreset: {
    description: "Whether to spawn a traversal pass per a preset. By default all presets are merged.",
    type: "boolean",
    default: false,
    hidden: true,
  },

  ignore: {
    type: "list",
    description: "list of glob paths to **not** process",
    default: []
  },

  only: {
    type: "list",
    description: "list of glob paths to **only** process"
  },

  metadata: {
    hidden: true,
    default: true,
    type: "boolean"
  },

  // toggles if code should be generated
  code: {
    hidden: true,
    default: true,
    type: "boolean"
  },

  // toggles if the ast should be included in the results
  ast: {
    hidden: true,
    default: true,
    type: "boolean"
  },

  dotfiles: {
    description: "Whether or not to look up .*rc and .*ignore files",
    type: "boolean",
    default: true
  },
};
