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

export function parseBlockStatement(blockContext = {}) {
  this.next();
  return this.parseBlock(blockContext);
}

// this can be any kind of block, not just detached (`!`) blocks
export function parseBlock(blockContext = {}) {
  let node = this.startNode();
  this.eat(tt.indent) && this.eat(tt.newline) || this.unexpected();
  this.parseBlockBody(node, blockContext);
  return this.finishNode(node, "BlockStatement");
}

// Parse a sequence of statements, seaparated by newlines, and enclosed in an
// indentation level. Handles `"use strict"` declarations when
// `blockContext.isFunction` is true

export function parseBlockBody(node, blockContext = {}) {
  const allowDirectives = !!blockContext.allowDirectives;
  // const allowStrict = !!blockContext.isFunction;
  const isTopLevel = !!blockContext.isTopLevel;
  let end = isTopLevel ? tt.eof : tt.dedent;

  node.body = [];
  node.directives = [];

  // let oldStrict;
  let finishedDirectives = false;
  while (!this.eat(end)) {
    if (allowDirectives && !finishedDirectives && this.match(tt.string)) {
      node.directives.push(this.parseDirective());
      continue;
    }
    finishedDirectives = true;
    node.body.push(this.parseStatement());
  }
  if (!isTopLevel) {
    if (this.match(tt.eof)) this.warn("Missing newline at end of file");
    this.eat(tt.newline) || this.eat(tt.eof) || this.unexpected();
  }
}
