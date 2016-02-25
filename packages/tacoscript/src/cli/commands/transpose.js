import TransformCli from "../transform";

import transpose from "../../transpose/api";

export default function(defaults, argv, cb) {
  return new TransposeCli(defaults).run(argv, cb);
}

class TransposeCli extends TransformCli {
  constructor(defaults) {
    super(defaults);

    this.name = "transpose";

    this.opts.default.extensions = ".js,.es6,.es"; // TODO: jsx
  }

  transformSync(code, opts) {
    return transpose.transform(code, opts);
  }

  prepare() {
    this.transformer = transpose.createTransform(this.comalOpts);
  }

  transformFile(file, opts, cb) {
    transpose.execFile(this.transformer, file, opts, cb);
  }
}
