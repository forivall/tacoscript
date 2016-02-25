import TransformCli from "../transform";

import compose from "../../compose/api";

class ComposeCli extends TransformCli {
  constructor(defaults) {
    super(defaults);

    this.name = "compose";

    this.opts.default.extensions = ".taco,.tacos,.tacoscript";
  }

  transformSync(code, opts) {
    return compose.transform(code, opts);
  }

  prepare() {
    this.transformer = compose.createTransform(this.comalOpts);
  }

  transformFile(file, opts, cb) {
    compose.execFile(this.transformer, file, opts, cb);
  }
}

export default function(defaults, argv, cb) {
  return new ComposeCli(defaults).run(argv, cb);
}
