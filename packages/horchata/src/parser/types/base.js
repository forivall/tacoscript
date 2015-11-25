/*
 * Copyright (C) 2012-2015 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

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

  this.parseBlockBody(program, {allowDirectives: !this.options.noTopLevelDirectives, isTopLevel: true});

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
  this.eatLineTerminator() || this.unexpected();
  return this.finishNode(directive, "Directive");
}

export function parseBlockStatement(blockContext = {}) {
  this.next();
  return this.parseBlock(blockContext);
}

// this can be any kind of block, not just detached (`!`) blocks
export function parseBlock(blockContext = {}) {
  let {allowEmpty} = blockContext;
  let node = this.startNode();
  if (this.eatLineTerminator()) {
    node = this.initBlockBody(node, blockContext);
  } else if (this.eat(tt.indent)) {
    this.eat(tt.newline);
    this.parseBlockBody(node, blockContext);
  } else if (allowEmpty) {
    node = this.initBlockBody(node, blockContext);
  } else {
    this.unexpected();
  }
  return this.finishNode(node, "BlockStatement");
}

export function initBlockBody(node, blockContext) {
  node.body = [];
  if (blockContext.allowDirectives) node.directives = [];
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

  this.initBlockBody(node, blockContext);

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
    node.body.push(this.parseStatement(true, isTopLevel));
  }
  if (!isTopLevel) {
    this.eatLineTerminator() || this.unexpected();
  }
  return node;
}
