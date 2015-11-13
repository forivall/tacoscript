import {types as tt} from "../../tokenizer/types";
import {isNewline} from "../../util/whitespace";

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

// expected cur.type: tt.string
export function parseDirective() {
  let directiveLiteral = this.startNode();
  let directive = this.startNode();

  let raw = this.input.slice(this.state.cur.start, this.state.cur.end);
  let value = raw.slice(1, -1); // remove quotes

  directiveLiteral.value = value;
  directiveLiteral.raw = raw;

  this.next();

  directive.value = this.finishNode(directiveLiteral, "DirectiveLiteral");
  this.eat(tt.newline) || this.unexpected();
  return this.finishNode(directive, "Directive");
}

export function parseBlockStatement(blockContext = {}) {
  this.next();
  return this.parseBlock(blockContext);
}

// this can be any kind of block, not just detached (`!`) blocks
export function parseBlock(blockContext = {}) {
  let node = this.startNode();
  if (this.eat(tt.newline) || this.eat(tt.eof)) {
    this.initBlockBody(node);
    return this.finishNode(node, "BlockStatement");
  }
  this.eat(tt.indent) && this.eat(tt.newline) || this.unexpected();
  this.parseBlockBody(node, blockContext);
  return this.finishNode(node, "BlockStatement");
}

export function initBlockBody(node) {
  node.body = [];
  node.directives = [];
  return node;
}

// Parse a sequence of statements, seaparated by newlines, and enclosed in an
// indentation level. Handles `"use strict"` declarations when
// `blockContext.allowDirectives` is true

export function parseBlockBody(node, blockContext = {}) {
  const allowDirectives = !!blockContext.allowDirectives;
  // const allowStrict = !!blockContext.isFunction;
  const isTopLevel = !!blockContext.isTopLevel;
  let end = isTopLevel ? tt.eof : tt.dedent;

  this.initBlockBody(node);

  // let oldStrict;
  let finishedDirectives = false;
  while (!this.eat(end)) {
    if (allowDirectives && !finishedDirectives && this.match(tt.string) &&
        // TODO: implement a fast, trailing-whitespace ignoring lookahead for this
        (this.state.cur.end >= this.input.length || isNewline(this.input.charCodeAt(this.state.cur.end)))) {
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
