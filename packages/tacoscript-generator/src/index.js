
/**
 * Tacoscript's code generator API, turns an ast into code
 */

import tacoPrinter from "./taco-printer";

// TODO: remove this class and just use a function.
export class CodeGenerator {
  constructor(ast, opts, code) {
    opts = opts || {};
    opts.language = opts.language || 'tacoscript';
    opts.format = opts.format || {preserve: true};
    if (opts.language === 'javascript') opts.language = 'ecmascript';

    this.printer = this.createPrinter(ast, opts, code);
  }

  static printers = {
    'tacoscript': tacoPrinter
  }

  createPrinter(ast, opts, code) {
    return new CodeGenerator.printers[opts.language](ast, opts, code);
  }

  generate() {
    return this.printer.generate();
  }
}

export default function (ast, opts, code) {
  let gen = new CodeGenerator(ast, opts, code);
  return gen.generate();
}
