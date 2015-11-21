/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

// TODO: rename to lexer everywhere in the code.

import {types as tt, keywords as keywordTypes} from "./types";
import {reservedWords, keywords, isIdentifierChar, isIdentifierStart, codePointToString} from "../util/identifier";
import {isNewline, nonASCIIwhitespace, lineBreak} from "../util/whitespace";
import State from "./state";
import {getOptions} from "../options";
// export {default as Token} from "./token";
import Token from "./token";
export {Token};

function keywordRegexp(words) {
  return new RegExp("^(" + words.join("|") + ")$");
}

export default class Lexer {
  // TODO: move input to parse(), change otions os that it only contains options
  // that are generic, no options that pertain to the source file
  constructor(options = {}) {
    this.options = getOptions(options);
    this.isLookahead = !!options.isLookahead;

    // Construct regexes for reserved words, according to settings
    this.keywords = keywordRegexp([].concat(keywords, reservedWords.tacoscript))
    this.reservedWords = keywordRegexp(reservedWords.es2015);
    this.reservedWordsStrict = keywordRegexp([].concat(reservedWords.es2015, reservedWords.strict));
    this.reservedWordsStrictBind = keywordRegexp([].concat(reservedWords.es2015, reservedWords.strict, reservedWords.strictBind))

    // These will be populated by `open()`
    this.file = this.input = this.state = null;

    if (!this.isLookahead) {
      this.lookahead = new Lexer({...options, isLookahead: true});
    }
  }

  raise() {
    throw new Error("Not Implemented");
  }

  // call this prior to start parsing
  // TODO: who's responsible for creating the file object?
  open(file) {
    this.file = file;
    this.input = this.file.input;
    if (!this.isLookahead) {
      this.state = new State();
      this.state.init(this.options, this.file);

      this.lookahead.open(file);
    }
  }
  close() {
    this.file = this.input = this.state = null;
  }

  // TODO: parse hash bang line as comment

  // Move to the next token
  // TODO: add a two-token fixed lookahead, assuming as context doesn't change
  //    and then when context changes, the lookahead is rebuilt
  // TODO: add dynamic lookahead, like how babylon does it.
  next() {
    this.onToken(Token.fromState(this.state.cur));

    this.state.prev = {...this.state.cur};
    if (!this.isLookahead) this.state.cur.index = this.state.tokens.length;

    this.nextToken();
  }

  // Check if the next token matches `type`
  match(type) {
    return this.state.cur.type === type;
  }

  // Check if the lookahead token matches `type`
  matchNext(type) {
    return this.state.next.type === type;
  }

  matchPrev(type) {
    return this.state.prev.type === type;
  }

  // Predicate that tests whether the next token is of the given
  // type, and if yes, consumes it as a side effect.
  eat(type) {
    if (this.match(type)) {
      this.next();
      return true;
    }
    return false;
  }

  // Raise an unexpected token error
  unexpected(pos) {
    console.error(this.state.cur);
    this.raise(pos != null ? pos : this.state.cur.start, "Unexpected Token");
  }

  // Read a single token & update the lexer state
  nextToken() {
    if (this.state.nextIndentation !== this.state.indentation) {
      if (this.state.nextIndentation > this.state.indentation) {
        return this.finishToken(tt.indent);
      } else {
        if (this.state.cur.type === tt.newline) {
          return this.finishToken(tt.dedent);
        } else {
          return this.finishToken(tt.newline);
        }
      }
    }

    let curContext = this.curContext();
    if (curContext == null || !curContext.preserveSpace) {
      if (this.state.eol && !isNewline(this.input.charCodeAt(this.state.pos))) {
        this.skipIndentation();
      }
      // newlines are significant, so this only skips comments and non-indentation whitespace
      this.skipNonTokens();
    }
    this.state.containsOctal = false;
    this.state.octalPosition = null;
    this.state.cur.start = this.state.pos;
    if (this.options.locations) this.state.cur.startLoc = this.state.curPosition();
    if (this.state.pos >= this.input.length) {
      if (this.state.indentation > 0) {
        this.state.nextIndentation = 0;
        return this.finishToken(tt.newline);
      }
      return this.finishToken(tt.eof);
    }

    if (curContext.override) return this.finishToken(tt.eof);
    else return this.readToken(this.fullCharCodeAtPos());
  }

  readToken(code) {
    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (isIdentifierStart(code) || code === 92 /* '\' */) {
      return this.readWord();
    }
    if (!this.state.eol && isNewline(code)) {
      // check for indentation change in the next line, if the next char is a newline.
      // this takes some annoying amount of lookahead, but we can optimise that later. If needed.
      if (this.hasIndentationChanged(code)) {
        if (this.state.nextIndentation > this.state.indentation) {
          return this.finishToken(tt.indent);
        } else {
          return this.finishToken(tt.newline);
        }
      }
    }
    return this.getTokenFromCode(code);
  }

  fullCharCodeAtPos() {
    let code = this.input.charCodeAt(this.state.pos);
    if (code <= 0xd7ff || code > 0xe000) return code; //single char code

    let next = this.input.charCodeAt(this.state.pos + 1);
    // TODO: figure out how this magic is and document it. from acorn.
    return (code << 10) + next - 0x35fdc00;
  }

  isSignificantWhitespace() {
    // let curContext = this.curContext();
    // TODO: move this to the standard contexts
    // TODO: is also insignificant if current token is `or`, `and`, or other binary non-postfix operators
    return this.state.significantWhitespaceContext[this.state.significantWhitespaceContext.length - 1];
  }

  skipIndentation() {
    // TODO: ...
    // throw new Error("Not Implemented");
    this.skipNonTokens(this.state.indentEnd);
    this.onNonToken(new Token(tt.tab, this.state.indentation));
    this.state.eol = false;
    if (this.state.indentEnd > this.state.pos) {
      this.state.pos = this.state.indentEnd;
    }
  }

  // based on acorn's skipSpace
  // parse & skip whitespace and comments
  skipNonTokens(end = this.input.length) {
    let start = this.state.pos;
    let startLoc = this.state.curPosition();
    let significantWhitespace = this.isSignificantWhitespace();
    while (this.state.pos < end) {
      let ch = this.input.charCodeAt(this.state.pos);
      // TODO: see if micro-optimization of order of checking ch is worth it

      // newline characters:  10, 8232, 8233, 13 (when followed by 10)
      let nextCh;
      if (ch === 92 && isNewline(nextCh = this.input.charCodeAt(this.state.pos + 1))) {
        // skip escaped newlines
        this.state.pos += nextCh === 13 && this.input.charCodeAt(this.state.pos + 2) === 10 ? 3 : 2;
      } else if (!(significantWhitespace && isNewline(ch) && this.state.cur.type !== tt.newline) &&
          // skip
          (ch === 32 || ch === 160 || ch > 8 && ch < 14 ||
            ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch)) && ch !== 8232 && ch !== 8233)) {
        // skip non-significant whitespace
        ++this.state.pos;
      } else {
        if (this.state.pos > start) {
          this.onNonToken(new Token(tt.whitespace,
            {code: this.input.slice(start, this.state.pos)},
            start, this.state.pos, startLoc, this.state.curPosition(),
            this.state
          ));
        }
        if (ch === 35) { // '#'
          if (this.input.charCodeAt(this.state.pos + 1) === 42) { // '*'
            this.skipBlockComment();
          } else {
            this.skipLineComment();
          }
          start = this.state.pos;
          startLoc = this.state.curPosition();
        } else {
          break;
        }
      }
    }
  }

  skipLineComment(startLength = 1) {
    let start = this.state.pos;
    let startLoc = this.curPosition();
    this.state.pos += startLength;
    this.onNonToken(new Token(tt.lineCommentStart, null,
      start, startLoc, this.state.pos, this.state.curPosition(), this.state
    ));

    start = this.state.pos;
    startLoc = this.curPosition();
    for (let ch; ch = this.input.charCodeAt(this.state.pos),
    this.state.pos < this.input.length &&
    ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233; ++this.state.pos);

    this.onNonToken(new Token(tt.lineCommentBody, this.input.slice(start, this.state.pos),
      start, startLoc, this.state.pos, this.state.curPosition(), this.state
    ));
  }

  skipBlockComment() {
    let start = this.state.pos;
    let startLoc = this.curPosition();
    this.state.pos += 2;
    this.onNonToken(new Token(tt.blockCommentStart, null,
      start, startLoc, this.state.pos, this.state.curPosition(), this.state
    ));

    start = this.state.pos;
    startLoc = this.curPosition();
    let end = this.input.indexOf("*#", this.state.pos);
    if (end === -1) this.raise(this.state.pos, "Unterminated comment");
    this.state.pos = end;
    this.onNonToken(new Token(tt.blockCommentBody, this.input.slice(start, this.state.pos),
      start, startLoc, this.state.pos, this.state.curPosition(), this.state
    ));

    start = this.state.pos;
    startLoc = this.curPosition();
    this.state.pos += 2;
    this.onNonToken(new Token(tt.blockCommentEnd, null,
      start, startLoc, this.state.pos, this.state.curPosition(), this.state
    ));
  }

  // Called at the end of each token. Sets type, val, end, endLoc.
  finishToken(type, val = type.label) {
    let cur = this.state.cur;
    let prevType = cur.type;
    cur.type = type;
    cur.value = val; // or read value from pos - 1
    cur.end = this.state.pos;
    cur.endLoc = this.state.curPosition();
    // when spread destructuring is optimised in babel
    // cur = {...cur, type, val, end: this.state.pos, endLoc: this.state.curPosition()};

    // TODO: add option to disable this
    this.state.cur.meta = {};

    this.updateContext(prevType);

    if (type === tt.indent) ++this.state.indentation;
    else if (type === tt.dedent) --this.state.indentation;

    if (!this.isLookahead && (
          type === tt.star && prevType === tt.parenR ||
          type === tt._get ||
          type === tt._set ||
          false)
        ) {
      this.lookahead.state = this.state.clone();
      this.lookahead.next();
      this.state.next = this.lookahead.state.cur;
    } else {
      this.state.resetNext();
    }

    return true;
  }

  finishArrow(type, len) {
    let start = this.state.pos;
    this.state.pos += len + ~~(this.input.charCodeAt(this.state.pos + len + 1) === 62);
    return this.finishToken(type, this.input.slice(start, this.state.pos));
  }

  finishEqOrType(type) {
    let start = this.state.pos;
    ++this.state.pos;
    let next = this.input.charCodeAt(this.state.pos);
    if (next === 61) {
      ++this.state.pos;
      return this.finishToken(tt.eq, this.input.slice(start, this.state.pos));
    }
    return this.finishToken(type);
  }

  // ### Token reading

  // This is the function that is called to fetch the next token. It
  // is somewhat obscure, because it works in character codes rather
  // than characters, and because operator parsing has been inlined
  // into it.
  //
  // All in the name of speed. And because it's a little bit more
  // flexible than regex.
  //

  // TODO: allow extension of each of these token endpoints to allow custom
  // multichar tokens.
  getTokenFromCode(code) {
    switch (code) {
      // newlines are significant!
      case 13:
        if (this.input.charCodeAt(this.state.pos + 1) === 10) {
          ++this.state.pos;
        }
      case 10: case 8232: case 8233:
        ++this.state.pos; return this.finishToken(tt.newline);

      // The interpretation of a dot depends on whether it is followed
      // by a digit or another two dots.
      case 46: // '.'
        // TODO: use "readNumberStartingWithDot" (that just calls readNumber, but it's for readability :))
        return this.readToken_dot();

      // Punctuation tokens.
      case 40: ++this.state.pos; return this.finishToken(tt.parenL);   // '('
      case 41: ++this.state.pos; return this.finishToken(tt.parenR);   // ')'
      case 59: ++this.state.pos; return this.finishToken(tt.semi);     // ';'
      case 44: ++this.state.pos; return this.finishToken(tt.comma);    // ','
      case 91: ++this.state.pos; return this.finishToken(tt.bracketL); // '['
      case 93: ++this.state.pos; return this.finishToken(tt.bracketR); // ']'
      case 123: ++this.state.pos; return this.finishToken(tt.braceL);  // '{'
      case 125: ++this.state.pos; return this.finishToken(tt.braceR);  // '}'

      case 33: return this.readToken_excl();     // '!'

      case 58:
        if (this.input.charCodeAt(this.state.pos + 1) === 58) {
          this.state.pos += 2;
          return this.finishToken(tt.doubleColon, '::');
        } else {
          ++this.state.pos;
          return this.finishToken(tt.colon);
        }

      case 63: ++this.state.pos; return this.finishToken(tt.question);
      // TODO: figure out alternate syntax for 'this' shorthand. Probably `@.`, but no standalone
      case 64: ++this.state.pos; return this.finishToken(tt.at);

      case 96: // '`'
        ++this.state.pos;
        return this.finishToken(tt.backQuote);

      case 48: // '0'
        let next = this.input.charCodeAt(this.state.pos + 1);
        if (next === 120 || next === 88) return this.readRadixNumber(16); // '0x', '0X' - hex number
        if (next === 111 || next === 79) return this.readRadixNumber(8); // '0o', '0O' - octal number
        if (next === 98 || next === 66) return this.readRadixNumber(2); // '0b', '0B' - binary number
        // Anything else beginning with a digit is an integer, octal
        // number, or float.
      case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
        return this.readNumber();

      // Quotes produce strings.
      case 34: case 39: // '"', "'"
        return this.readString(code);

      // Operators are parsed inline in tiny state machines. '=' (61) is
      // often referred to. `finishOp` simply skips the amount of
      // characters it is given as second argument, and returns a token
      // of the type given by its first argument.

      case 47: // '/'
        return this.readToken_slash();

      case 37: return this.finishEqOrType(tt.modulo); // '%'
      case 42: return this.finishEqOrType(tt.star); //'*'
      case 124: return this.finishEqOrType(tt.bitwiseOR); // '|'
      case 38: return this.finishEqOrType(tt.bitwiseAND); // '&'
      case 94: return this.finishEqOrType(tt.bitwiseXOR); // '^'

      // TODO: handle arrows _here_

      case 43: case 45: // '+-'
        return this.readToken_plus_min(code);

      case 60: case 62: // '<>'
        return this.readToken_lt_gt(code);

      case 61: // '='
        return this.readToken_eq();

      case 126: // '~'
        ++this.state.pos;
        return this.finishToken(tt.bitwiseNOT);
    }
    this.raise(this.state.pos, "Unexpected character '" + codePointToString(code) + "'");
  }

  // NOTE: please alphabetize read* functions

  // Maybe read indentation. If this is the first indentation found,
  // sets the indentation settings. `expectedLevels` is only used when detecting
  // indentation, otherwise, it's ignored and the aprser should return errors
  // according to the amount of indents it expects.
  // the only case where more than one level of indentation is expected is when
  // we are in the header of a statement, then two levels of indentation is expected.

  // TODO: skip comments

  // IF YOU ARE READING THIS, FEEL FREE TO SUBMIT A PULL REQUEST TO CLEAN THIS UP
  hasIndentationChanged(newlineCode, expectedLevels = 1) {
    this.state.eol = true;
    this.state.indentStart = this.state.pos + 1;
    if (newlineCode === 13 && this.input.charCodeAt(this.state.indentStart) === 10) {
      this.state.indentStart++;
    }
    // First time encountering an indent, try to detect what indent is supposed to be, with condextual information
    if (this.state.indentCharCode === -1) {
      // detect indent
      let pos = this.state.indentStart;
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
          inconsistentIndentation = false;
          indentCharCode = -1;
        } else if (ch === indentCharCode) {
          ++pos;
        } else if (ch === 32 || ch === 160 || ch > 8 && ch < 14 ||
            ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch)) && ch !== 8232 && ch !== 8233) {
          if (indentCharCode !== -1) {
            inconsistentIndentation = true;
            ++pos;
            continue;
          }
          indentCharCode = ch;
          ++pos;
        } else {
          break;
        }
      }
      if (inconsistentIndentation) this.raise(this.state.pos, "Inconsistent Indentation");

      this.state.indentEnd = pos;
      if (this.state.indentEnd === this.state.indentStart) {
        // No indent yet, just return.
        return false;
      } else {
        let indentRepeat = (this.state.indentEnd - this.state.indentStart) / expectedLevels;
        if (Math.floor(indentRepeat) !== indentRepeat) this.raise(this.state.pos, "Invalid Indentation");
        this.state.indentString = this.input.slice(this.state.indentStart, this.state.indentStart + indentRepeat);
        this.state.indentCharCode = indentCharCode;
        this.state.indentRepeat = indentRepeat;
        this.state.nextIndentation = expectedLevels;
        return true;
      }
    } else {
      // we have already detected the indentation settings, see if the level of indentation is different.
      let pos = this.state.indentStart;
      let indentCharCode = this.state.indentCharCode;
      let inconsistentIndentation = false;
      while (pos < this.input.length) {
        let ch = this.input.charCodeAt(pos);
        // TODO: this should be overhauled at some point
        // TODO: look at cpython's code, or just for + use detect-indnet
        if (isNewline(ch)) {
          ++pos;
          if (ch === 13 && this.input.charCodeAt(pos) === 10) ++pos;
          this.state.indentStart = pos;
          inconsistentIndentation = false;
        } else if (ch === indentCharCode) {
          ++pos;
        } else if (ch === 32 || ch === 160 || ch > 8 && ch < 14 ||
            ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch)) && ch !== 8232 && ch !== 8233) {
          inconsistentIndentation = true;
        } else {
          break;
        }
        if (inconsistentIndentation) this.raise(this.state.pos, "Inconsistent Indentation");
      }

      this.state.indentEnd = pos;

      let indentCount = (this.state.indentEnd - this.state.indentStart) / this.state.indentRepeat;
      if (Math.floor(indentCount) !== indentCount) this.raise(this.state.pos, "Invalid Indentation");
      this.state.nextIndentation = indentCount;
      return this.state.nextIndentation !== this.state.indentation;
    }
  }

  readIndentationDirective(code) {
    throw new Error("Not Implemented");
  }

  // Read an integer, octal integer, or floating-point number.
  readNumber(startsWithDot) {
    let start = this.state.pos;
    let isFloat = false;
    let octal = this.input.charCodeAt(this.state.pos) === 48;
    if (!startsWithDot && this.readNumber_int(10) === null) this.raise(start, "Invalid number");

    let next = this.input.charCodeAt(this.state.pos);
    if (next === 46) { // '.'
      ++this.state.pos;
      this.readNumber_int(10);
      isFloat = true;
      next = this.input.charCodeAt(this.state.pos);
    }
    if (next === 69 || next === 101) { // 'eE'
      next = this.input.charCodeAt(++this.state.pos);
      if (next === 43 || next === 45) ++this.state.pos; // '+-'
      if (this.readNumber_int(10) === null) this.raise(start, "Invalid number");
      isFloat = true;
    }
    if (isIdentifierStart(this.fullCharCodeAtPos())) this.raise(this.state.pos, "Identifier directly after number");

    let str = this.input.slice(start, this.state.pos);
    let val;
    if (isFloat) {
      val = parseFloat(str);
    } else if (!octal || str.length === 1) {
      val = parseInt(str, 10);
    } else if (/[89]/.test(str) || !this.isOctalValid()) {
      this.raise(start, "Invalid number");
    } else {
      val = parseInt(str, 8);
    }
    // TODO: also store raw source
    return this.finishToken(tt.num, val);
  }

  // Read an integer in the given radix. Return null if zero digits
  // were read, the integer value otherwise. When `len` is given, this
  // will return `null` unless the integer has exactly `len` digits.

  // Also used for reading escape sequences
  readNumber_int(radix, len) {
    let start = this.state.pos;
    let total = 0;
    for (let i = 0, end = len == null ? Infinity : len; i < end; ++i) {
      let code = this.input.charCodeAt(this.state.pos);
      let val;
      if (code >= 97) {
        val = code - 97 + 10; // a-z
      } else if (code >= 65) {
        val = code - 65 + 10; // A-Z
      } else if (code >= 48 && code <= 57) {
        val = code - 48; // 0-9
      } else  {
        val = Infinity;
      }
      if (val >= radix) break;
      ++this.state.pos;
      total = total * radix + val;
    }
    if (this.state.pos === start || len != null && this.state.pos - start !== len) return null;

    return total;
  }

  readRadixNumber(radix) {
    this.state.pos += 2; // 0x
    let val = this.readNumber_int(radix);
    if (val == null) this.raise(this.state.cur.start + 2, "Expected number in radix " + radix);
    if (isIdentifierStart(this.fullCharCodeAtPos())) this.raise(this.state.pos, "Identifier directly after number");
    return this.finishToken(tt.num, val);
  }

  // Read a string value, interpreting backslash-escapes.

  readCodePoint() {
    let ch = this.input.charCodeAt(this.state.pos);
    let code;

    if (ch === 123) {
      let codePos = ++this.state.pos;
      code = this.readHexChar(this.input.indexOf('}', this.state.pos) - this.state.pos);
      ++this.state.pos;
      if (code > 0x10FFFF) this.raise(codePos, "Code point out of bounds");
    } else {
      code = this.readHexChar(4);
    }
    return code;
  }

  readRegexp() {
    let escaped, inClass, start = this.state.pos;
    for (;;) {
      if (this.state.pos >= this.input.length) this.raise(start, "Unterminated regular expression");
      let ch = this.input.charAt(this.state.pos);
      if (lineBreak.test(ch)) {
        this.raise(start, "Unterminated regular expression");
      }
      if (escaped) {
        escaped = false;
      } else {
        if (ch === "[") {
          inClass = true;
        } else if (ch === "]" && inClass) {
          inClass = false;
        } else if (ch === "/" && !inClass) {
          break;
        }
        escaped = ch === "\\";
      }
      ++this.state.pos;
    }
    let pattern = this.input.slice(start, this.state.pos);
    ++this.state.pos;
    // Need to use `readWordSingle` because '\uXXXX' sequences are allowed
    // here (don't ask).
    let flags = this.readWordSingle(true);
    if (flags) {
      let validFlags = /^[gmsiyu]*$/;
      if (!validFlags.test(flags)) this.raise(start, "Invalid regular expression flag");
    }
    return this.finishToken(tt.regexp, {
      pattern: pattern,
      flags: flags
    });
  }

  readString(quoteChar) {
    let out = "";
    let chunkStart = ++this.state.pos;
    for (;;) {
      if (this.state.pos >= this.input.length) this.raise(this.state.cur.start, "Unterminated string constant");
      let ch = this.input.charCodeAt(this.state.pos);
      if (ch === quoteChar) break;
      if (ch === 92) { // '\'
        out += this.input.slice(chunkStart, this.state.pos);
        out += this.readEscapedChar(false);
        chunkStart = this.state.pos;
      } else {
        if (isNewline(ch)) this.raise(this.state.cur.start, "Unterminated string constant");
        ++this.state.pos;
      }
    }
    out += this.input.slice(chunkStart, this.state.pos++);
    return this.finishToken(tt.string, out);
  }

  readToken_dot() {
    let next = this.input.charCodeAt(this.state.pos + 1);
    if (next >= 48 && next <= 57) return this.readNumber(true);
    let nextnext = this.input.charCodeAt(this.state.pos + 2);
    if (next === 46 && nextnext === 46) {
      this.state.pos += 3;
      return this.finishToken(tt.ellipsis);
    } else {
      ++this.state.pos;
      return this.finishToken(tt.dot);
    }
  }

  readToken_eq() {
    let next = this.input.charCodeAt(this.state.pos + 1);
    if (next === 62) { // '=>'
      return this.finishArrow(tt.arrow, 2);
    }
    ++this.state.pos;
    if (this.finishTokenMaybe_equality("=", next)) return;
    return this.finishToken(tt.eq, "=");
  }

  readToken_excl() {
    ++this.state.pos;
    if (this.finishTokenMaybe_equality("!", this.input.charCodeAt(this.state.pos))) return;
    return this.finishToken(tt.excl);
  }

  finishTokenMaybe_equality(prefix, next) {
    if (next === 61) {
      if (this.input.charCodeAt(this.state.pos + 1) === 61) {
        this.state.pos += 2;
        return this.finishToken(tt.equality, prefix + "==");
      } else {
        ++this.state.pos;
        return this.finishToken(tt.equality, prefix + "=");
      }
    } else {
      return false;
    }
  }

  readToken_lt_gt(code) { // '<>'
    let start = this.state.pos;
    let next = this.input.charCodeAt(this.state.pos + 1);
    let size = 1;

    if (next === code) {
      size = code === 62 && this.input.charCodeAt(this.state.pos + 2) === 62 ? 3 : 2;
      if (this.input.charCodeAt(this.state.pos + size) === 61) {
        this.state.pos += size + 1;
        return this.finishToken(tt.assign, this.input.slice(start, this.state.pos));
      }
      this.state.pos += size;
      return this.finishToken(tt.bitShift, this.input.slice(start, this.state.pos));
    }

    if (next === 33 && code === 60 && this.input.charCodeAt(this.state.pos + 2) === 45 && this.input.charCodeAt(this.state.pos + 3) === 45) {
      if (this.inModule) this.unexpected();
      // `<!--`, an XML-style comment that should be interpreted as a line comment
      throw new Error("Not Implemented");
      this.skipLineComment(4);
      this.skipSpace();
      return this.nextToken();
    }

    if (next === 61) {
      size = this.input.charCodeAt(this.state.pos + 2) === 61 ? 3 : 2;
    }

    this.state.pos += size;
    return this.finishToken(tt.relational, this.input.slice(start, this.state.pos));
  }

  readToken_plus_min(code) {
    let next = this.input.charCodeAt(this.state.pos + 1);
    let nextnext = this.input.charCodeAt(this.state.pos + 2);
    if (next === code) {
      if (next === 45 && nextnext === 62 && lineBreak.test(this.input.slice(this.state.prev.end, this.state.pos))) {
        // A `-->` line comment
        throw new Error("Not Implemented");
      }
      this.state.pos += 2;
      return this.finishToken(tt.incDec, next === 45 ? '--' : '++');
    }
    if (next === 61) { // =
      if (code === 43 && nextnext === 62) { // +=>
        return this.finishArrow(tt.asyncBoundArrow, 3);
      }
      this.state.pos += 2;
      return this.finishToken(tt.assign, code === 45 ? "-=" : "+=");
    }
    if (next === 62) {
      return this.finishArrow(code === 45 ? tt.unboundArrow : tt.asyncArrow, 2)
    }
    ++this.state.pos;
    return this.finishToken(tt.plusMin, code === 45 ? "-" : "+");
  }

  readToken_slash() { // '/'
    if (this.state.exprAllowed) {
      ++this.state.pos;
      return this.readRegexp();
    }
    ++this.state.pos;
    if (this.input.charCodeAt(this.state.pos) === 61) {
      ++this.state.pos;
      return this.finishToken(tt.assign, "/=");
    }
    return this.finishToken(tt.slash, "/")
  }

  // Read an identifier or keyword token
  readWord() {
    let word = this.readWordSingle();
    let type = tt.name;
    if (!this.state.containsEsc && this.keywords.test(word)) {
      type = keywordTypes[word];
      // TODO: move to method to allow customization by plugins
      if (type === tt._and || type === tt._or) {
        if (this.input.charCodeAt(this.state.pos) === 61) { // and=, or=
          ++this.state.pos;
          return this.finishToken(tt.assign, type.keyword + "=");
        }
      }
    }
    return this.finishToken(type, type === tt.name ? {value: word, raw: this.input.slice(this.state.cur.start, this.state.pos)} : word);
  }

  // Read an identifier, and return it as a string. Sets `state.containsEsc`
  // to whether the word contained a '\u' escape, or if it started with `\$`
  //
  // Incrementally adds only escaped chars, adding other chunks as-is
  // as a micro-optimization.

  readWordSingle(allowEmpty) {
    this.state.containsEsc = false;
    let word = "";
    let first = true;
    let chunkStart = this.state.pos;

    while (this.state.pos < this.input.length) {
      let ch = this.fullCharCodeAtPos();
      if (isIdentifierChar(ch)) {
        this.state.pos += ch <= 0xffff ? 1 : 2;
      } else if (ch === 92) { // "\"
        this.state.containsEsc = true;
        word += this.input.slice(chunkStart, this.state.pos);

        let escStart = this.state.pos;
        ++this.state.pos;
        // Tacoscript-specific syntax: reserved words can be used as identifiers
        // when started with "\$"; for the purpose of parsing the actual name,
        // just skip the "\$"

        if (first && this.input.charCodeAt(this.state.pos) === 36) {
          ++this.state.pos;
          chunkStart = this.state.pos;
          first = false;
          continue;
        }
        if (this.input.charCodeAt(this.state.pos) !== 117) { // "u"
          this.raise(this.state.pos, "Expected Unicode escape sequence \\uXXXX");
        }

        ++this.state.pos;
        let esc = this.readCodePoint();
        if (!(first ? isIdentifierStart : isIdentifierChar)(esc)) {
          this.raise(escStart, "Invalid Unicode escape");
        }
        word += codePointToString(esc);
        chunkStart = this.state.pos;
      } else {
        break;
      }
      first = false;
    }
    word += this.input.slice(chunkStart, this.state.pos);
    if (!allowEmpty && word.length <= 0) {
      this.raise(this.state.pos, "Invalid Identifier name")
    }
    return word;
  }

  readHexChar(len) {
    let codePos = this.pos;
    let n = this.readNumber_int(16, len);
    if (n === null) this.raise(codePos, "Bad character escape sequence")
    return n
  }

  // Used to read escaped characters

  readEscapedChar(inTemplate) {
    ++this.state.pos;
    let ch = this.input.charCodeAt(this.state.pos);
    ++this.state.pos;
    switch (ch) {
      case 110: return "\n"; // 'n' -> '\n'
      case 114: return "\r"; // 'r' -> '\r'
      case 120: return String.fromCharCode(this.readHexChar(2)); // 'x'
      case 117: return codePointToString(this.readCodePoint()); // 'u'
      case 116: return "\t"; // 't' -> '\t'
      case 98: return "\b"; // 'b' -> '\b'
      case 118: return "\u000b"; // 'v' -> '\u000b'
      case 102: return "\f"; // 'f' -> '\f'
      case 13:
        if (this.input.charCodeAt(this.state.pos) === 10) ++this.state.pos; // '\r\n'
        // fallthrough
      case 10: // ' \n'
        if (this.options.locations) {
          this.state.lineStart = this.state.pos; ++this.state.curLine;
        }
        return ""
      default:
        if (ch >= 48 && ch <= 55) {
          let octalStr = this.input.substr(this.state.pos - 1, 3).match(/^[0-7]+/)[0];
          let octal = parseInt(octalStr, 8);
          if (octal > 255) {
            octalStr = octalStr.slice(0, -1);
            octal = parseInt(octalStr, 8);
          }
          if (octal > 0 && (this.state.strict || inTemplate)) {
            this.raise(this.state.pos - 2, "Octal literal in strict mode");
          }
          this.state.pos += octalStr.length - 1;
          return String.fromCharCode(octal);
        }
        return String.fromCharCode(ch);
    }
  }

  ////////////// Token Storage //////////////

  onToken(token) {
    if (this.isLookahead) return;
    this.state.tokens.push(token);
    this.onSourceElementToken(token);
  }

  onNonToken(token) {
    this.onSourceElementToken(token);
  }

  onSourceElementToken(token) {
    if (this.isLookahead) return;
    this.state.sourceElementTokens.push(token);
  }
}
