import { types as tt } from "../../tokenizer/types";

// TODO: move to tokenizer, since this deals with token types and not node parsing. maybe

export function isForKeyword(type) {
  // will be extended by simple range loop plugin, for `upto` and `downto`
  return type === tt._in || type === tt._of;
}

export function matchForKeyword() {
  return this.isForKeyword(this.state.cur.type);
}

export function isLineTerminator(type) {
  return (
    type === tt.newline ||
    type === tt.doublesemi ||
    this.state.indentation === 0 && type === tt.eof ||
  false);
}

export function matchLineTerminator() {
  return this.isLineTerminator(this.state.cur.type);
}

export function matchPrevTerminator() {
  return this.isLineTerminator(this.state.prev.type);
}

export function eatLineTerminator(options = {}) {
  if (this.matchLineTerminator()) {
    if (this.state.indentation > 0 || !this.match(tt.eof)) {
      this.next();
    }
    return true;
  } else if (options.allowPrev && this.matchPrevTerminator()) {
    return true;
  }
  return false;
}
