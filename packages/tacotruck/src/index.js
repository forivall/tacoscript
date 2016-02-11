
/**
 * Tacoscript's code generator API, turns an ast into code
 */

export {name, version} from "../package.json";

import Printer from "./printer";
import detectIndent from "./detect-indent";

export function generate(ast, opts, code) {
  opts = opts || {};
  opts.format = opts.format || {};
  opts.format.indent = opts.format.indent || detectIndent(code);

  let gen = new Printer(ast, opts, code);
  return gen.generate();
}

// for backwards compatability
export default generate;
