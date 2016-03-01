
import pirates from "pirates";

import babelPresetEs2015 from "babel-preset-es2015";
import babelPresetStage0 from "babel-preset-stage-0";

import {compose, compile} from "tacoscript";

let count = 0;
let revert, transformer, compiler;

export function enable(opts = {}) {
  // TODO: only default compile to true if a .babelrc is found or if there's a
  //       babel config in a package.json
  if (!("compile" in opts)) opts.compile = true;

  count++;
  if (count > 1) {
    // TODO: update opts of existing transform / compile
    return;
  }

  transformer = compose.createTransform(opts);

  // TODO: only define this config if there's no .babelrc or babel section in package.json
  // TODO: use babel-features to only transpile the es6 features that aren't natively
  // supported by the runtime
  if (opts.compile) compiler = compile.createTransform({
    presets: [babelPresetEs2015, babelPresetStage0],
    compact: true
  });

  revert = pirates.addHook(hook, {
    exts: ['.taco', '.tacos', '.tacoscript']
    // TODO: matcher, filter on `only` and `ignore`
  });
}

export function disable() {
  count--;
  if (count > 0) return;
  revert();
  compiler = transformer = null;
}

function hook(code, filename) {
  // TODO: if we're compiling too, don't generate code. <- should be moved into comal
  const results = compose.exec(transformer, code, {filename});
  if (compiler) {
    return compile.execFromAst(compiler, results.ast, code, {filename}).code;
  }
  return results.code;
}
