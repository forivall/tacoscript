
import babelPresetEs2015 from "babel-preset-es2015";
import babelPresetStage0 from "babel-preset-stage-0";

import TransformCli from "../transform";
import compose from "../../compose/api";
import compile from "../../compile/api";

export default function(defaults, argv, cb) {
  return new CompileCli(defaults).run(argv, cb);
}

class CompileCli extends TransformCli {
  constructor(defaults) {
    super(defaults);

    this.name = "compile";

    this.opts.default.extensions = ".taco,.tacos,.tacoscript";
  }

  transformSync(code, opts) {
    // TODO: preserve sourcemap, etc.
    let composeResults = compose.transform(code, opts)
    // TODO: retrieve options from cli
    // TODO: only define this config if there's no .babelrc or babel section in package.json
    return compile.transformFromAst(composeResults.ast, code, {
      presets: [babelPresetEs2015, babelPresetStage0],
      compact: true
    });
  }

  prepare() {
    this.transformer = compose.createTransform(this.comalOpts);
    // TODO: retreive options from cli
    this.compiler = compile.createTransform({
      presets: [babelPresetEs2015, babelPresetStage0],
      compact: true
    });
  }

  transformFile(file, opts, cb) {
    compose.execFile(this.transformer, file, opts, (err, results, code) => {
      if (err) return cb(err);
      return cb(null, compile.execFromAst(this.compiler, results.ast, code, opts));
    });
  }
}
