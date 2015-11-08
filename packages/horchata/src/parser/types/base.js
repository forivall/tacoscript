import { types as tt } from "../../tokenizer/types";
import Parser from "../index";
import { lineBreak } from "../../util/whitespace";

const pp = Parser.prototype;
// TODO: instead of having subfiles attach their functions to the prototype,
// have the base

// Top Level Parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

pp.parseTopLevel = function(file, program) {
  program.sourceType = this.options.sourceType;

  this.parseBlockBody(program, true, true, tt.eof);

  file.program  = this.finishNode(program, "Program");
  file.comments = this.state.comments;
  file.tokens   = this.state.tokens;

  return this.finishNode(file, "File");
};

pp.parseBlockStatement = function() {
  throw new Error("Not Implemented");
}

// this can be any kind of block, not just detached (`!`) blocks
pp.parseBlock = function() {
  let node = this.startNode();
  this.expect(tt.indent);
  this.parseBlockBody(node, )
}

// Parse a sequence of statements, seaparated by newlines, and enclosed in an
// indentation level
// TODO: Handle use of `use strict`. Currently, use strict is just parsed, but
// not error checked.

pp.parseBlockBody = function(node, allowDirectives, isTopLevel) {
  let end = isTopLevel ? tt.eof : tt.dedent;

  node.body = [];
  node.directives = [];

  let finishedDirectives = false;
  while (!this.eat(end)) {
    if (allowDirectives && !finishedDirectives && this.match(tt.string)) {
      node.directives.push(this.parseDirective());
      continue;
    }
    finishedDirectives = true;
    node.body.push(this.parseStatement());
  }

}

pp.checkOctal
