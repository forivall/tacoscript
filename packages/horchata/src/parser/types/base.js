import { types as tt } from "../../tokenizer/types";

// Top Level Parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

export function parseTopLevel(file, program) {
  program.sourceType = this.options.sourceType;
  file.program = program;

  this.parseBlockBody(program, {allowDirectives: true, isTopLevel: true});

  file.program  = this.finishNode(program, "Program");
  file.comments = this.state.comments;
  file.tokens   = this.state.tokens;
  file.warnings = this.state.warnings;

  return this.finishNode(file, "File");
}

export function parseBlockStatement() {
  throw new Error("Not Implemented");
}

// this can be any kind of block, not just detached (`!`) blocks
export function parseBlock() {
  let node = this.startNode();
  this.expect(tt.indent);
  this.parseBlockBody(node);
}

// Parse a sequence of statements, seaparated by newlines, and enclosed in an
// indentation level
// TODO: Handle use of `use strict`. Currently, use strict is just parsed, but
// not error checked.

export function parseBlockBody(node, blockContext = {}) {
  const allowDirectives = !!blockContext.allowDirectives;
  const isTopLevel = !!blockContext.isTopLevel;
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
