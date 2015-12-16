
// Add methods to various prototypes
import "./tokenizer/context";
import "./tokenizer/serialization";

// Export bindings from lexer
export {TokenType, types as tokTypes, keywords as keywordTypes} from "./tokenizer/types";
export Lexer, {Token} from "./tokenizer";
export * as tokComments from "./tokenizer/comments";

// Main API
import Parser from "./parser";

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
