
// Add methods to various prototypes
import "./lexer/context";
import "./lexer/indentation";
import "./lexer/serialization";

// Export bindings from lexer
export {TokenType, types as tokTypes, keywords as keywordTypes} from "./lexer/types";
export Lexer, {Token} from "./lexer";
export * as tokComments from "./lexer/comments";
export * as whitespace from "./util/whitespace.js";

// Main API
import Lexer from "./lexer";
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

export function registerPlugin(name, load, init) {
  Parser.addPlugin(name, load);
  if (init != null) init(Parser.prototype, Lexer.prototype);
}
