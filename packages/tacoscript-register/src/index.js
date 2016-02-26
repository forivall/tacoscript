
import pirates from "pirates";

import babelPresetEs2015 from "babel-preset-es2015";
import babelPresetStage0 from "babel-preset-stage-0";

import {compose, compile} from "tacoscript";

let count = 0;
let revert, transformer, compiler;

export default function register() {
  count++;
  if (count > 1) return;

  transformer = compose.createTransform();

  // TODO: only define this config if there's no .babelrc or babel section in package.json
  // TODO: use babel-features to only transpile the es6 features that aren't natively
  // supported by the runtime
  compiler = compile.createTransform({
    presets: [babelPresetEs2015, babelPresetStage0],
    compact: true
  });

  revert = pirates.addHook(compileHook, {
    exts: ['.taco', '.tacos', '.tacoscript']
    // TODO: matcher, filter on `only` and `ignore`
  });
}

export function unregister() {
  count--;
  if (count > 0) return;
  revert();
  compiler = transformer = null;
}

function compileHook(code, filename) {
  const results = compose.exec(transformer, code, {filename});
  return compile.execFromAst(compiler, results.ast, code, {filename}).code;
}
