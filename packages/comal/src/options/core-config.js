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

  passPerPreset: {
    description: "Whether to spawn a traversal pass per a preset. By default all presets are merged.",
    type: "boolean",
    default: false,
    hidden: true,
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

  metadata: {
    hidden: true,
    default: true,
    type: "boolean"
  },

  // toggles if code should be generated. Alternatively, meta should just not
  // include a generator
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
};
