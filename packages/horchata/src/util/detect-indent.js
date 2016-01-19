import repeating from 'repeating';
import {types as ct} from '../tokenizer/context-types';
import Lexer from '../tokenizer';

import {lineBreak, lineBreakG, isNewline, nonASCIIwhitespace} from "./whitespace"

export default function (input) {
  if (typeof input !== 'string') {
    throw new TypeError('Expected a string');
  }

  const len = input.length;
  let pos = 0, ch, indentCh = -1, indentLen;
  let amount = Infinity;
  let inIndent = true;
  let curContext = ct.stmt;
  let context = [curContext];

  top:
  while (pos < len) {
    ch = input.charCodeAt(pos);
    switch (curContext) {
      case ct.stmt:
      case ct.obj_expr:
      case ct.
    }
    if (indentCh === -1) {
      // whitespace
      if (ch === 32 || ch === 160 || ch === 9 || ch === 11 || ch === 12 ||
          ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        indentCh = ch;
      }
    }



  // lineBreak.lastIndex = pos, match = lineBreak.exec(str)))
  }

  if (amount > 9999) amount = 0;
  return {
    amount: amount,
    type: indentCh === 9 ? 'tab' : 'space',
    indent: repeating(amount, String.fromCharCode(indentCh)),
    irregular: indentCh !== 9 && indentCh !== 32,
    nonAscii: indentCh >= 5760
  }
}

function nextValidLineStart(input, pos) {
  // TODO
  // skip comments
  // skip lines with just comments
  // skip code wrapped in parens, except functions and statementy expressions
  // skip empty lines
  // stop on a newline with leading whitespace
}
