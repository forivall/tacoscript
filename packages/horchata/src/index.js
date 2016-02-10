
export {name, version} from "../package.json";

// Add methods to various prototypes
import "./lexer/context";
import "./lexer/indentation";
import "./lexer/serialization";

// Export bindings from lexer
export {TokenType, types as tokTypes, keywords as keywordTypes} from "./lexer/types";
export {TokContext, types as contextTypes} from "./lexer/context-types";
export {codePointToString} from "./util/identifier";
export Lexer, {Token} from "./lexer";
export * as tokComments from "./lexer/comments";
export * as whitespace from "./util/whitespace.js";

// Main API
import SourceFile from "./file";
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

// TODO: test this function
export function lex(input, options) {
  let lexer = new Lexer(options);
  let file = new SourceFile(input, options);
  lexer.open(file);
  lexer.nextToken();
  while (lexer.next());
  let tokens = lexer.state.tokens;
  lexer.close();
  return tokens;
}

// Plugin API
export {registerPlugin, registerPluginModule} from "./plugin";
