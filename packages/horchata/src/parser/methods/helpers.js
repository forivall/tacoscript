import { types as tt } from "../../tokenizer/types";

export function parseIndentableList(close, context, inner) {
  const {allowTrailingComma, separator = tt.comma, noTerminator} = context;
  let elements = [];
  let indented = false;
  let first = true;

  let firstSeparatorStart;

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
      if (this.eat(tt.comma)) {
        indented && this.eat(tt.newline); // TODO: allow a strict mode where commas + newlines aren't allowed
      } else if (indented && (this.eat(tt.newline) || this.matchPrev(tt.newline)));
      else if (close === null && (noTerminator || this.matchLineTerminator())) {
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
    } else if (allowTrailingComma && (close === null ? this.matchLineTerminator() : this.match(close))) {
      break;
    }
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
      noTerminator || this.eatLineTerminator() || this.unexpected();
    }
  }
  return {firstSeparatorStart};
}
