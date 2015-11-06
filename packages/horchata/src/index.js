
// Extend lexer prototype accordingly
import "./tokenizer/context";

// Extend parser prototype accordingly
import "./parser/nodeMethods";

// Export bindings from parser and lexer
export {Parser} from "./parser"
export {types as tokTypes} from "./tokenizer/types";

// Main API
import {Parser} from "./parser";

// The main interface is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [estree]. Additional
// ast nodes are documented in the doc/ folder.
//
// [estree]: https://github.com/estree/estree

export function parse(input, options) {
  return new Parser(options).parse(input);
}

export function parseFile(file, options) {
  return new Parser(options).parseFile(file);
}
