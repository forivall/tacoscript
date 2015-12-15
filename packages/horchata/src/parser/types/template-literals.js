/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import { types as tt } from "../../tokenizer/types";

// Parse template expression.

export function parseTemplate() {
  let node = this.startNode();
  this.next();
  node.expressions = [];
  let cur = this.parseTemplateElement();
  this.add(node, "quasis", cur);
  while (!cur.tail) {
    this.eat(tt.dollarBraceL) || this.unexpected();
    this.add(node, "expressions", this.parseExpression());
    this.eat(tt.braceR) || this.unexpected();
    cur = this.parseTemplateElement();
    this.add(node, "quasis", cur);
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral");
}

export function parseTemplateElement() {
  let elem = this.startNode();
  this.assignRaw(elem, "value", {
    raw: this.input.slice(this.state.cur.start, this.state.cur.end).replace(/\r\n?/g, "\n"),
    cooked: this.state.cur.value
  });
  this.next();
  elem.tail = this.match(tt.backQuote);
  return this.finishNode(elem, "TemplateElement");
}
