/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

// TODO: rename to lexer everywhere in the code.

import {types as tt, keywords as keywordTypes} from "./types";
import {reservedWords, keywords, isIdentifierChar, isIdentifierStart, codePointToString} from "../util/identifier";
import {isNewline, nonASCIIwhitespace} from "../util/whitespace";
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
  constructor(options) {
    this.options = getOptions(options);

    // Construct regexes for reserved words, according to settings
    this.keywords = keywordRegexp([].concat(keywords, reservedWords.tacoscript))
    this.reservedWords = keywordRegexp(reservedWords.es2015);
    this.reservedWordsStrict = keywordRegexp([].concat(reservedWords.es2015, reservedWords.strict));
    this.reservedWordsStrictBind = keywordRegexp([].concat(reservedWords.es2015, reservedWords.strict, reservedWords.strictBind))

    // These will be populated by `open()`
    this.file = this.input = this.state = null;
  }

  raise() {
    throw new Error("Not Implemented");
  }

  // call this prior to start parsing
  // TODO: who's responsible for creating the file object?
  open(file) {
    this.file = file;
    this.input = this.file.input;
    this.state = new State();
    this.state.init(this.options, this.file);
  }
  close() {
    this.file = this.input = this.state = null;
  }

  // TODO: parse hash bang line as comment

  // Move to the next token
  next() {
    this.onToken(Token.fromState(this.state.cur));

    this.state.prev = {...this.state.cur};
    this.state.cur.index = this.state.tokens.length;

    this.nextToken();
  }

  // Check if the next token matches `type`
  match(type) {
    return this.state.cur.type === type;
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
    let curContext = this.curContext();
    if (curContext == null || !curContext.preserveSpace) {
      if (this.state.eol) {
        this.skipIndentation();
      }
      // newlines are significant, so this only skips comments and non-indentation whitespace
      this.skipNonTokens();
    }
    this.state.containsOctal = false;
    this.state.octalPosition = null;
    this.state.cur.start = this.state.pos;
    if (this.options.locations) this.state.cur.startLoc = this.state.curPosition();
    if (this.state.pos >= this.input.length) return this.finishToken(tt.eof);

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
      if (this.readIndentationMaybe(code)) return;
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

  curContext() { return this.state.context[this.state.context.length - 1]; }
  isSignificantWhitespace() {
    return this.state.significantWhitespaceContext[this.state.significantWhitespaceContext.length - 1];
  }

  skipIndentation() {
    // TODO: ...
    // throw new Error("Not Implemented");
    this.onNonToken(new Token(tt.tab, this.state.indentation));
    this.state.eol = false;
    this.state.pos = this.state.indentPos;
  }

  // based on acorn's skipSpace
  // parse & skip whitespace and comments
  skipNonTokens() {
    let start = this.state.pos;
    let startLoc = this.state.curPosition();
    let significantWhitespace = this.isSignificantWhitespace();
    while (this.state.pos < this.input.length) {
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
  finishToken(type, val) {
    let cur = this.state.cur;
    let prevType = cur.type;
    cur.type = type;
    cur.value = val || type.label; // or read value from pos - 1
    cur.end = this.state.pos;
    cur.endLoc = this.state.curPosition();
    // when spread destructuring is optimised in babel
    // cur = {...cur, type, val, end: this.state.pos, endLoc: this.state.curPosition()};

    // TODO: add option to disable this
    this.state.cur.meta = {};

    this.updateContext(prevType);
  }

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
      case 33: ++this.state.pos; return this.finishToken(tt.excl);     // '!'

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
        let next = this.input.charCodeAt(this.pos + 1);
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

      case 37: case 42: // '%*'
        return this.readToken_mult_modulo(code);

      case 124: case 38: // '|&'
        return this.readToken_pipe_amp(code);

      case 94: // '^'
        return this.readToken_caret();

      // TODO: handle arrows _here_

      case 43: case 45: // '+-'
        return this.readToken_plus_min(code);

      case 60: case 62: // '<>'
        return this.readToken_lt_gt(code);

      case 61: // '='
        return this.readToken_eq();

      case 126: // '~'
        return this.finishToken(tt.bitwiseNOT);
    }
    this.raise(this.state.pos, "Unexpected character '" + codePointToString(code) + "'");
  }

  // NOTE: please alphabetize read* functions

  readCodePoint() {
    throw new Error("Not Implemented");
  }

  readIndentationMaybe(newlineCode) {
    this.state.eol = true;
    this.state.indentPos = this.state.pos + 1;
    if (newlineCode === 13 && this.input.charCodeAt(this.state.indentPos) === 10) {
      this.state.indentPos++;
    }
    // TODO: instead of assuming the first indent is one indent level,
    // the parser should indicate how many indentation levels are needed.
    if (this.state.indentCharCode === -1) {
      // detect indent
      let startIndent = this.state.indentPos;
      while (this.state.pos < this.input.length) {
        let ch = this.input.charCodeAt(this.state.indentPos);
        // TODO: skip blank lines
        // TODO: decide if comments should start an indentation level. probably not.
        // TODO: revise skipIndentation to also skip non-tokens in blank lines first.
        if (ch === 32 || ch === 160 || ch > 8 && ch < 14 ||
            ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch)) && ch !== 8232 && ch !== 8233) {
          ++this.state.indentPos;
        } else {
          break;
        }
      }
      if (this.state.indentPos === startIndent) {
        // No indent yet, just return.
        return false;
      } else {
        throw new Error("Not Implemented");
      }
    } else {
      throw new Error("Not Implemented");
    }
  }

  readIndentationDirective(code) {
    throw new Error("Not Implemented");
  }

  readToken_eq() {
    if (this.input.charCodeAt(this.pos + 1) === 62) { // '=>'
      this.pos += 2;
      return this.finishToken(tt.arrow);
    }
    return this.finishToken(tt.eq);
  }

  // Read an identifier or keyword token
  readWord() {
    let word = this.readWordSingle();
    let type = tt.name;
    if (!this.state.containsEsc && this.keywords.test(word)) {
      type = keywordTypes[word];
    }
    return this.finishToken(type, {value: word, raw: this.input.slice(this.state.cur.start, this.state.pos)});
  }

  // Read an identifier, and return it as a string. Sets `state.containsEsc`
  // to whether the word contained a '\u' escape, or if it started with `\$`
  //
  // Incrementally adds only escaped chars, adding other chunks as-is
  // as a micro-optimization.

  readWordSingle() {
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
    return word + this.input.slice(chunkStart, this.state.pos);
  }

  ////////////// Token Storage //////////////

  onToken(token) {
    this.state.tokens.push(token);
    this.onSourceElementToken(token);
  }

  onNonToken(token) {
    this.onSourceElementToken(token);
  }

  onSourceElementToken(token) {
    this.state.sourceElementTokens.push(token);
  }
}
