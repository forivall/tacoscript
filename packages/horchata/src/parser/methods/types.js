import { types as tt } from "../../tokenizer/types";

// TODO: move to tokenizer, since this deals with token types and not node parsing. maybe

export function isForKeyword(type) {
  // will be extended by simple range loop plugin, for `upto` and `downto`
  return type === tt._in || type === tt._of;
}

export function matchForKeyword() {
  return this.isForKeyword(this.state.cur.type);
}

export function isTerminator(type) {
  return type === tt.newline || type === tt.doublesemi || type === tt.eof;
}

export function matchTerminator() {
  return this.isTerminator(this.state.cur.type);
}

export function eatTerminator() {
  if (this.matchTerminator()) {
    if (!this.match(tt.eof)) {
      this.next();
    }
    return true;
  }
  return false;
}
