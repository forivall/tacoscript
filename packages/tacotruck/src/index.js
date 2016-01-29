
/**
 * Tacoscript's code generator API, turns an ast into code
 */

import Printer from "./printer";
import detectIndent from "./detect-indent";

export default function (ast, opts, code) {
  opts = opts || {};
  opts.language = opts.language || 'tacoscript';
  opts.format = opts.format || {};
  opts.format.indent = opts.format.indent || detectIndent(code);

  let gen = new Printer(ast, opts, code);
  return gen.generate();
}
