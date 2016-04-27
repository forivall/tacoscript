import {types as tt} from "../../lexer/types";

// TODO: comment this
// TODO: eventually, this could be replaced by a pass through the tokenizer
//       where the newlines, etc. are replaced by commas where appropriate
export function parseIndentableList(close, context, inner) {
  const {allowTrailingComma, separator = tt.comma, noTerminator} = context;
  let indented = false;
  let first = true;

  let firstSeparatorStart, firstConcreteSeparatorStart;

  if (this.eat(tt.newline)) {
    // must be empty
    if (close !== null) {
      this.eat(close) || this.unexpected();
    }
    return {};
  }

  if (close === null && this.state.cur.meta.continuedPreviousLine) return {};

  loop: while (close === null || !this.match(close)) {
    if (!indented) {
      indented = this.eat(tt.indent);
      if (indented && first) {
        firstSeparatorStart = this.state.prev.start;
        first = false;
      }
    }

    if (first) {
      first = false;
    } else {
      if (firstSeparatorStart === undefined) firstSeparatorStart = this.state.cur.start;
      if (this.eat(separator)) {
        if (firstConcreteSeparatorStart === undefined) firstConcreteSeparatorStart = this.state.prev.start;
        indented && this.eat(tt.newline); // TODO: allow a strict mode where commas + newlines aren't allowed
      } else if (indented && (this.eat(tt.newline) || this.matchPrev(tt.newline))) { /* do nothing */ }
      else if (close === null && (noTerminator || this.matchLineTerminator({ignoredNewline: true}) || this.matchPrev(tt.newline))) {
        break;
      } else this.unexpected();
    }

    if (indented && this.eat(tt.dedent)) {
      indented = false;
      if (close !== null) {
        this.eat(tt.newline);
        this.match(close) || this.unexpected();
      }
      break;
    } else if (allowTrailingComma) {
      if (allowTrailingComma !== "indent" || indented) {
        if (close === null ? this.matchLineTerminator({ignoredNewline: true}) : this.match(close)) {
          break;
        }
      }
    }
    this.eat(tt.newline);

    switch (inner.call(this, {})) {
      case "break": break loop;
    }
  }

  if (close !== null) {
    let isClosed = this.eat(close);
    if (indented) {
      this.eat(tt.newline);
      this.eat(tt.dedent) || this.unexpected();
    }
    // TODO: allow ellipsis after dedent just before close
    if (!isClosed) this.eat(close) || this.unexpected();
  } else {
    if (indented) {
      this.eat(tt.dedent) || this.unexpected();
    } else {
      noTerminator || this.eatLineTerminator({ignoredNewline: true}) || this.matchPrev(tt.newline) || this.unexpected();
    }
  }
  return {firstSeparatorStart, firstConcreteSeparatorStart};
}

import {getLineInfo} from "../../util/location";

export function _getLineInfo(pos) {
  return getLineInfo(this.input, pos);
}
