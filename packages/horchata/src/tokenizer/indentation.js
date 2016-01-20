
import {isNewline, nonASCIIwhitespace} from "../util/whitespace";
import {types as tt} from "./types";
import Token from "./token";

import Lexer from "./index";

const lp = Lexer.prototype;

lp.skipIndentation = function skipIndentation() {
  if (this.state.indentStart > this.state.pos) {
    this.skipNonTokens(this.state.indentStart);
  }
  if (this.state.indentEnd > this.state.indentStart) {
    this.endNonToken(new Token(tt.tab, this.state.indentation, this.state.indentStart, this.state.indentEnd));
  }
  if (this.state.indentEnd > this.state.pos) {
    this.state.pos = this.state.indentEnd;
  }
  this.state.eol = false;
}

// Maybe read indentation. If this is the first indentation found,
// sets the indentation settings. `expectedLevels` is only used when detecting
// indentation, otherwise, it's ignored and the aprser should return errors
// according to the amount of indents it expects.
// the only case where more than one level of indentation is expected is when
// we are in the header of a statement, then two levels of indentation is expected.

// TODO: skip comments

// IF YOU ARE READING THIS, FEEL FREE TO SUBMIT A PULL REQUEST TO CLEAN THIS UP
lp.hasIndentationChanged = function hasIndentationChanged(newlineCode, expectedLevels = 1) {
  this.state.eol = true;
  this.state.eolPos = this.state.pos;
  this.state.indentStart = this.state.pos + 1;
  if (newlineCode === 13 && this.input.charCodeAt(this.state.indentStart) === 10) {
    this.state.indentStart++;
  }
  // First time encountering an indent, try to detect what indent is supposed to be, with condextual information
  if (this.state.indentCharCode === -1) {
    // detect indent
    let pos = this.state.indentStart;
    let indentLen = 0;
    let indentEnd = -1;
    let indentCharCode = -1;
    let inconsistentIndentation = false;
    while (pos < this.input.length) {
      let ch = this.input.charCodeAt(pos);
      // TODO: this should be overhauled at some point
      // TODO: look at cpython's code, or just for + use detect-indnet
      if (isNewline(ch)) {
        ++pos;
        if (ch === 13 && this.input.charCodeAt(pos) === 10) ++pos;
        this.state.indentStart = pos;
        indentLen = 0;
        indentEnd = -1;
        indentCharCode = -1;
        inconsistentIndentation = false;
      // TODO: also restart check when there's comments.
      } else if (ch === indentCharCode) {
        ++pos; ++indentLen;
      } else if (ch === 32 || ch === 160 || ch > 8 && ch < 14 ||
          ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch)) && ch !== 8232 && ch !== 8233) {
        if (indentCharCode !== -1) {
          inconsistentIndentation = true;
          ++pos; ++indentLen;
          continue;
        }
        indentCharCode = ch;
        ++pos; ++indentLen;
      } else if (this._isCommentStart(ch, pos)) {
        if (indentEnd === -1) indentEnd = pos;
        pos = this._findCommentEnd(ch, pos);
        ch = this.input.charCodeAt(pos);
        if (!isNewline(ch) && (ch === 32 || ch === 160 || ch > 8 && ch < 14 ||
            ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch)) && ch !== 8232 && ch !== 8233)) {
          break;
        }
      } else {
        break;
      }
    }
    if (inconsistentIndentation) this.raise(this.state.pos, "Inconsistent Indentation");

    this.state.indentEnd = indentEnd === -1 ? pos : indentEnd;

    if (indentLen === 0) {
      // No indent yet, just return.
      return false;
    } else {
      let indentRepeat = indentLen / expectedLevels;
      if (Math.floor(indentRepeat) !== indentRepeat) this.raise(this.state.pos, "Invalid Indentation");
      this.state.indentString = this.input.slice(this.state.indentStart, this.state.indentStart + indentRepeat);
      this.state.indentCharCode = indentCharCode;
      this.state.indentRepeat = indentRepeat;
      this.state.nextIndentation = expectedLevels;
      this.file.format.indent = {
        amount: indentRepeat,
        type: indentCharCode === 9 ? 'tab' : 'space',
        indent: this.state.indentString,
      }
      return true;
    }
  } else {
    // we have already detected the indentation settings, see if the level of indentation is different.
    let pos = this.state.indentStart;
    let indentLen = 0;
    let indentEnd = -1;
    let indentCharCode = this.state.indentCharCode;
    let inconsistentIndentation = false;
    while (pos < this.input.length) {
      let ch = this.input.charCodeAt(pos);
      // TODO: this should be overhauled at some point
      // TODO: look at cpython's code, or just use detect-indnet
      if (isNewline(ch)) {
        ++pos;
        if (ch === 13 && this.input.charCodeAt(pos) === 10) ++pos;
        this.state.indentStart = pos;
        indentLen = 0;
        indentEnd = -1;
        inconsistentIndentation = false;
      } else if (ch === indentCharCode && indentEnd === -1) {
        ++pos; ++indentLen;
      } else if (ch === 32 || ch === 160 || ch > 8 && ch < 14 ||
          ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        if (indentEnd === -1) {
          inconsistentIndentation = true;
        } else {
          ++pos;
        }
      } else if (this._isCommentStart(ch, pos)) {
        if (indentEnd === -1) indentEnd = pos;
        pos = this._findCommentEnd(ch, pos);
        ch = this.input.charCodeAt(pos);
        if (!isNewline(ch) && (ch === 32 || ch === 160 || ch > 8 && ch < 14 ||
            ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch)) && ch !== 8232 && ch !== 8233)) {
          break;
        }
      } else {
        break;
      }

      if (inconsistentIndentation) this.raise(this.state.pos, "Inconsistent Indentation");
    }

    this.state.indentEnd = indentEnd === -1 ? pos : indentEnd;

    let indentCount = indentLen / this.state.indentRepeat;
    if (Math.floor(indentCount) !== indentCount) this.raise(this.state.pos, "Invalid Indentation");
    this.state.nextIndentation = indentCount;
    return this.state.nextIndentation !== this.state.indentation;
  }
}

lp.readIndentationDirective = function readIndentationDirective(code) {
  throw new Error("Not Implemented");
}
