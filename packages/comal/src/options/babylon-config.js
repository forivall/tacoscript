// TODO: move into `tacoscript` package

import fileConfig from "./file-config";

export default {
  filename: fileConfig.filename,

  sourceType: {
    description: "",
    default: "module"
  },
};
