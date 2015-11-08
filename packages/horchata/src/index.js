
// TODO: rather than extending prototypes from other modules and importing
// them here, create mixins, and extend the prototype from the same file that
// contains the class definition

// Extend lexer prototype accordingly
import "./tokenizer/context";

// Extend parser prototype accordingly
import "./parser/nodeMethods";
import "./parser/types/base";
import "./parser/types/statements";

// Export bindings from lexer
export {types as tokTypes} from "./tokenizer/types";

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
