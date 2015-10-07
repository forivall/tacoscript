
/**
 * Tacoscript's code generator, turns an ast into tacoscript code
 *
 * TODO: share code between the tacoscript and javascript generators
 */

export class CodeGenerator {
  constructor(ast, opts, code) {
    opts = opts || {};
    opts.language = opts.language || 'tacoscript';
    if (opts.language === 'javascript') opts.language = 'ecmascript';

    this.ast = ast;
    this.opts = opts;
    this.code = code;
    this.printer = this.createPrinter();
  }

  createPrinter() {

  }

  generate() {
    return this.printer.generate();
  }
}

export default function (ast, opts, code) {
  let gen = new CodeGenerator(ast, opts, code);
  return gen.generate();
}
