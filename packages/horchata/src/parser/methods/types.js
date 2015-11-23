import { types as tt } from "../../tokenizer/types";

// TODO: move to tokenizer, since this deals with token types and not node parsing. maybe

export function isForKeyword(type) {
  // will be extended by simple range loop plugin, for `upto` and `downto`
  return type === tt._in || type === tt._of;
}

export function matchForKeyword() {
  return this.isForKeyword(this.state.cur.type);
}

// TODO: replace relevant uses of `tt.newline` || `tt.eof` with `isLineTerminator()`
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

export function eatLineTerminator() {
  if (this.matchLineTerminator()) {
    if (this.state.indentation > 0 || !this.match(tt.eof)) {
      this.next();
    }
    return true;
  }
  return false;
}
