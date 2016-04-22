/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

// TODO: rename to lexer everywhere in the code.

import {types as tt, keywords as keywordTypes} from "./types";
import {reservedWords, keywords, isIdentifierChar, isIdentifierStart, codePointToString} from "../util/identifier";
import {isNewline, nonASCIIwhitespace, lineBreak, lineBreakG} from "../util/whitespace";
import State from "./state";
import {getOptions} from "../options";
// export {default as Token} from "./token";
import {SourceLocation} from "../util/location";
import {blockCommentMeta} from "./comments";
const blockCommentJs = blockCommentMeta['/*'];
import Token from "./token";
export {Token};

function keywordRegexp(words) {
  return new RegExp("^(" + words.join("|") + ")$");
}

/**
 * The Lexer / Tokenizer. Based on acorn / babylon's tokenizer, with indentation
 * detection partially based on python, partly handwritten.
 *
 * See context.js and indentation.js for methods not directly included here.
 */
export default class Lexer {
  // TODO: move input to parse(), change otions os that it only contains options
  // that are generic, no options that pertain to the source file
  constructor(options = {}) {
    this.options = getOptions(options);

    // Construct regexes for reserved words, according to settings
    this.keywordsJs = keywordRegexp([].concat(keywords));
    this.keywords = keywordRegexp([].concat(keywords, reservedWords.tacoscript));
    this.reservedWords = keywordRegexp(reservedWords.es2015);
    this.reservedWordsStrict = keywordRegexp([].concat(reservedWords.es2015, reservedWords.strict));
    this.reservedWordsStrictBind = keywordRegexp([].concat(reservedWords.es2015, reservedWords.strict, reservedWords.strictBind))

    // These will be populated by `open()`
    this.file = this.input = this.state = null;
  }

  raise(pos, message) {
    throw new Error(`${message} at pos ${pos}`);
  }

  assert(assertion) {
    if (!assertion) {
      this.raise(this.state.pos, "Assertion failed");
    }
  }

  hasFeature(featureName) {
    // equivalent to babylon "hasPlugin"
    return this.options.features['*'] || this.options.features[featureName];
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

  // Retrieve the next token for the parser
  next() {
    this.state.index++;

    return this.nextToken();
  }

  nextToken() {
    let token = null;
    if (this.state.tokens.length <= this.state.index) {
      token = this.readNextToken();
    }

    this.state.prev = this.state.cur;
    this.state.cur = this.state.tokens[this.state.index];
    if (this.state.tokens.length > (this.state.index + 1)) {
      this.state.next = this.state.tokens[this.state.index + 1];
    } else {
      this.state.resetNext();
    }
    return token;
  }

  // Read a single token & update the lexer state
  readNextToken() {
    this.state.prevLexType = this.state.lex.type;

    if (this.state.nextIndentation !== this.state.indentation) {
      if (this.state.nextIndentation > this.state.indentation) {
        return this.finishToken(tt.indent);
      } else {
        if (this.state.prevLexType === tt.newline) {
          return this.finishToken(tt.dedent);
        } else {
          return this.finishToken(tt.newline);
        }
      }
    }

    let curContext = this.curContext();
    if (curContext == null || !curContext.preserveSpace) {
      if (this.state.eol && this.state.pos !== this.state.eolPos) {
        this.skipIndentation();
      }
      // newlines are significant, so this only skips comments and non-indentation whitespace
      this.skipNonTokens();
    }
    this.state.containsOctal = false;
    this.state.octalPosition = null;

    this.startTokenLex();

    if (this.state.pos >= this.input.length) {
      if (this.state.indentation > 0) {
        this.state.nextIndentation = 0;
        return this.finishToken(tt.newline);
      }
      if (this.state.lex.type !== tt.eof || this.state.tokens.length === 0) {
        return this.finishToken(tt.eof);
      } else {
        return;
      }
    }

    if (curContext.override) return curContext.override(this);
    else return this.readToken(this.fullCharCodeAtPos());
  }

  // Read n tokens (usually for lookahead)
  readNextTokens(count) {
    for (let i = count; i >= 0; i--) {
      this.readNextToken();
    }
  }

  startTokenLex() {
    this.state.lex.start = this.state.pos;
    if (this.options.locations) this.state.lex.startLoc = this.state.curPosition();
  }

  finishTokenLex(type, val) {
    let lex = this.state.lex;
    lex.type = type;
    lex.value = val; // or read value from pos - 1
    lex.end = this.state.pos;
    lex.endLoc = this.state.curPosition();
    lex.index = this.state.tokens.length;
  }

  // Called at the end of each token. Sets type, val, end, endLoc.
  finishToken(type, val) {
    if (val === undefined) val = type.label;
    let prevType = this.state.lex.type;
    this.finishTokenLex(type, val);
    this.updateContext(type, prevType);

    if (type === tt.indent) ++this.state.indentation;
    else if (type === tt.dedent) --this.state.indentation;

    let token = Token.fromState(this.state.lex);

    this.endToken(token);

    // Lookahead to see if the newline should actually be ignored, and ignore it if so
    if (token.type === tt.newline) {
      let nextToken = this.readNextToken();

      if (nextToken.type.continuesPreviousLine) {
        // convert newline token to whitespace, for sourceElementTokens
        token.type = tt.whitespace;
        token.value = {code: this.input.slice(token.start, token.end)};
        // TODO: coalesce sequential whitespace sourceElements

        // remove newline from concrete tokens
        this.assert(this.state.tokens.pop() === nextToken);
        this.assert(this.state.tokens.pop() === token);
        this.state.tokens.push(nextToken);
        token = nextToken;
        token.meta.continuedPreviousLine = true;
      }
    }

    return token;
  }

  ensureLookahead(count = 1) {
    const needed = (this.state.index + count) - (this.state.tokens.length - 1);
    if (needed > 0) {
      this.readNextTokens(needed);
      if (this.state.next.type === tt.unknown) {
        this.state.next = this.state.tokens[this.state.index + 1];
      }
    }
    return true;
  }

  readToken(code) {
    if (!this.state.eol && isNewline(code)) {
      // lookahead to check for indentation change in the next line, if the next char is a newline
      if (this.hasIndentationChanged(code)) {
        if (this.state.nextIndentation > this.state.indentation) {
          return this.finishToken(tt.indent);
        } else {
          return this.finishToken(tt.newline);
        }
      }
    }
    return this.readConcreteToken(code);
  }

  readConcreteToken(code) {
    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (isIdentifierStart(code) || code === 92 /* '\' */) {
      return this.readWord();
    }
    return this.getTokenFromCode(code);
  }

  fullCharCodeAtPos() {
    let code = this.input.charCodeAt(this.state.pos);
    if (code <= 0xd7ff || code > 0xe000) return code; // single char code

    let next = this.input.charCodeAt(this.state.pos + 1);
    // TODO: figure out how this magic is and document it. from acorn.
    return (code << 10) + next - 0x35fdc00;
  }

  // based on acorn's skipSpace
  // parse & skip whitespace and comments
  skipNonTokens(end = this.input.length) {
    const storeWhitespace = (start, end, startLoc, endLoc) => {
      this.endNonToken(new Token(tt.whitespace, {code: this.input.slice(start, end)}, start, end, startLoc, endLoc, this.state))
    };
    let start = this.state.pos;
    let startLoc = this.state.curPosition();
    while (this.state.pos < end) {
      let ch = this.input.charCodeAt(this.state.pos);
      // TODO: see if micro-optimization of order of checking ch is worth it

      // newline characters:  10, 8232, 8233, 13 (when followed by 10)
      let nextCh, chIsNewline;
      if (ch === 92 && isNewline(nextCh = this.input.charCodeAt(this.state.pos + 1))) {
        // skip escaped newlines
        this.state.pos += nextCh === 13 && this.input.charCodeAt(this.state.pos + 2) === 10 ? 3 : 2;
        this.state.curLine++; this.state.lineStart = this.state.pos;
      } else if ((!(chIsNewline = isNewline(ch)) || (this.state.lex && this.state.lex.type.continuesExpr)) &&
          // skip
          (ch === 32 || ch === 160 || ch > 8 && ch < 14 ||
            ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch)))) {
        // skip non-significant whitespace
        ++this.state.pos;
        if (chIsNewline) {
          this.state.curLine++; this.state.lineStart = this.state.pos;
        }
      } else {
        if (this.state.pos > start) {
          storeWhitespace(start, this.state.pos, startLoc, this.state.curPosition());
        }
        if (ch === 35) { // '#'
          let next = this.input.charCodeAt(this.state.pos + 1);
          if (next === 42 || next === 37) { // '*', '%'
            this.skipBlockComment();
          } else if (next === 35 && this.input.charCodeAt(this.state.pos + 2) === 35 && isNewline(this.input.charCodeAt(this.state.pos + 3))) {
            this.skipBlockComment(3);
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
    if (this.state.pos >= end && this.state.pos > start) {
      storeWhitespace(start, this.state.pos, startLoc, this.state.curPosition());
    }
  }

  _startCommentNode(loc) {
    return {
      type: "",
      start: this.state.pos,
      end: 0,
      tokenStart: this.state.sourceElementTokens.length,
      tokenEnd: 0,
      index: this.state.comments.length,
      loc: new SourceLocation(this.state, loc),
    }
  }

  _finishCommentNode(node, type, loc) {
    node.type = type;
    node.end = this.state.pos;
    node.tokenEnd = this.state.sourceElementTokens.length;
    node.loc.end = loc;
    return node;
  }

  skipLineComment(startLength = 1) {
    let start = this.state.pos;
    let startLoc = this.state.curPosition(), endLoc;
    let node = this._startCommentNode(startLoc);
    this.state.pos += startLength;
    let startKind = this.input.slice(start, this.state.pos);
    this.endNonToken(new Token(tt.lineCommentStart, {kind: startKind, code: startKind, index: node.index},
      start, this.state.pos, startLoc, this.state.curPosition(), this.state
    ));

    start = this.state.pos;
    startLoc = this.state.curPosition();
    for (let ch; ch = this.input.charCodeAt(this.state.pos),
    this.state.pos < this.input.length && !isNewline(ch); ++this.state.pos);

    let raw = this.input.slice(start, this.state.pos);
    let commentBody = raw;
    if (/ +\*/.test(commentBody)) {
      commentBody = commentBody.slice(1);
    }
    node.value = commentBody;
    this.endNonToken(new Token(tt.lineCommentBody, {kind: startKind, code: raw, value: commentBody, index: node.index},
      start, this.state.pos, startLoc, endLoc = this.state.curPosition(), this.state
    ));
    this.state.comments.push(this._finishCommentNode(node, "CommentLine", endLoc));
  }

  skipBlockComment(startLength = 2) {
    let start = this.state.pos;
    let startLoc = this.state.curPosition(), endLoc;
    let node = this._startCommentNode(startLoc);
    this.state.pos += startLength;
    let commentKind = this.input.slice(start, this.state.pos);
    let meta = blockCommentMeta[commentKind];
    this.endNonToken(new Token(tt.blockCommentStart, {kind: commentKind, code: commentKind, index: node.index},
      start, this.state.pos, startLoc, this.state.curPosition(), this.state
    ));

    start = this.state.pos;
    startLoc = this.state.curPosition();
    let end = this.input.indexOf(meta.terminator, this.state.pos);
    // TODO: make sure that ending `###` is alone on a line (and starts alone on a line)
    if (end === -1) this.raise(this.state.pos, "Unterminated comment");
    this.state.pos = end;

    // properly set curLine
    lineBreakG.lastIndex = start;
    let match;
    while ((match = lineBreakG.exec(this.input)) && match.index < this.state.pos) {
      ++this.state.curLine;
      this.state.lineStart = match.index + match[0].length;
    }
    lineBreakG.lastIndex = 0; // reset lineBreakG

    let raw = this.input.slice(start, this.state.pos);
    let commentBody = raw;
    // TODO: move to "encode/decode comment" function
    if (meta.isCanonical) commentBody = commentBody.replace(meta.terminatorEscapeSubRe, meta.terminatorSub);
    commentBody = node.value = commentBody.replace(blockCommentJs.terminatorSubRe, blockCommentJs.terminatorEscapeSub);

    this.endNonToken(new Token(tt.blockCommentBody, {kind: commentKind, code: raw, value: commentBody, index: node.index},
      start, this.state.pos, startLoc, this.state.curPosition(), this.state
    ));

    start = this.state.pos;
    startLoc = this.state.curPosition();
    this.state.pos += 2;
    this.endNonToken(new Token(tt.blockCommentEnd, {kind: commentKind, code: this.input.slice(start, this.state.pos), index: node.index},
      start, this.state.pos, startLoc, endLoc = this.state.curPosition(), this.state
    ));

    if (meta.isCanonical) this.state.comments.push(this._finishCommentNode(node, "CommentBlock", endLoc));
  }

  _isCommentStart(ch, pos) {
    if (ch === 35) return true; // '#'
    if (this.state.inModule) return false;
    const next = this.input.charCodeAt(pos + 1);
    // <!--
    if (ch === 60 && next === 33 && this.input.charCodeAt(pos + 2) === 45 && this.input.charCodeAt(pos + 3) === 45) return true;
    // -->
    if (ch === 45 && next === 45 && this.input.charCodeAt(pos + 2) === 62) return true;
    return false;
  }

  // Simplified version of skipComment for indentation detection
  // possible optimization: store the locations found here so that this can be done quickly
  _findCommentEnd(ch, pos) {
    const next = this.input.charCodeAt(pos + 1);
    const isXmlLine = !this.state.inModule && ch !== 35;
    const blockCommentKind = !isXmlLine && (
      next === 42 ? "#*" :
      next === 37 ? "#$" :
      next === 35 && this.input.charCodeAt(this.state.pos + 2) === 35 && isNewline(this.input.charCodeAt(this.state.pos + 3)) ? "###" : false
    )
    if (blockCommentKind) {
      const meta = blockCommentMeta[blockCommentKind];
      let end = this.input.indexOf(meta.terminator, pos + meta.startLen);
      // TODO: make sure that ending `###` is alone on a line (and starts alone on a line)
      if (end === -1) this.raise(pos, "Unterminated comment");
      pos = end + meta.endLen;
    } else {
      lineBreakG.lastIndex = pos;
      const match = lineBreakG.exec(this.input)
      pos = match ? match.index : this.input.length;
      lineBreakG.lastIndex = 0; // reset lineBreakG
    }
    return pos;
  }

  finishArrow(len = 2) {
    let start = this.state.pos;
    this.state.pos += len + ~~(this.input.charCodeAt(this.state.pos + len) === 62); // =>/=>>
    return this.finishToken(tt.arrow, this.input.slice(start, this.state.pos));
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
        ++this.state.pos;
        ++this.state.curLine;
        this.state.lineStart = this.state.pos;
        return this.finishToken(tt.newline);

      // The interpretation of a dot depends on whether it is followed
      // by a digit or another two dots.
      case 46: // '.'
        // TODO: use "readNumberStartingWithDot" (that just calls readNumber, but it's for readability :))
        return this.readToken_dot();

      // Punctuation tokens.
      case 40: ++this.state.pos; return this.finishToken(tt.parenL);   // '('
      case 41: ++this.state.pos; return this.finishToken(tt.parenR);   // ')'
      case 44: ++this.state.pos; return this.finishToken(tt.comma);    // ','
      case 91: ++this.state.pos; return this.finishToken(tt.bracketL); // '['
      case 93: ++this.state.pos; return this.finishToken(tt.bracketR); // ']'
      case 123: ++this.state.pos; return this.finishToken(tt.braceL);  // '{'
      case 125: ++this.state.pos; return this.finishToken(tt.braceR);  // '}'

      case 59: return this.readToken_semi();     // ';'
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
      case 124: return this.finishEqOrType(tt.bitwiseOR); // '|'
      case 38: return this.finishEqOrType(tt.bitwiseAND); // '&'
      case 94: return this.finishEqOrType(tt.bitwiseXOR); // '^'

      case 42: return this.readToken_star(); //'*'

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
    this.raise(this.state.pos, `Unexpected character '${codePointToString(code)}' (${code})`);
  }

  // NOTE: please alphabetize read* functions

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
    if (val == null) this.raise(this.state.lex.start + 2, "Expected number in radix " + radix);
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
      if (this.state.pos >= this.input.length) this.raise(this.state.lex.start, "Unterminated string constant");
      let ch = this.input.charCodeAt(this.state.pos);
      if (ch === quoteChar) break;
      if (ch === 92) { // '\'
        out += this.input.slice(chunkStart, this.state.pos);
        out += this.readEscapedChar(false);
        chunkStart = this.state.pos;
      } else {
        if (isNewline(ch)) this.raise(this.state.lex.start, "Unterminated string constant");
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
      return this.finishArrow();
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

    if (!this.state.inModule && next === 33 && code === 60 && this.input.charCodeAt(this.state.pos + 2) === 45 && this.input.charCodeAt(this.state.pos + 3) === 45) {
      // `<!--`, an XML-style comment that should be interpreted as a line comment
      this.skipLineComment(4);
      this.skipNonTokens();
      return this.readNextToken();
    }

    if (next === 61) size = 2;

    this.state.pos += size;
    return this.finishToken(tt.relational, this.input.slice(start, this.state.pos));
  }

  readToken_plus_min(code) {
    let next = this.input.charCodeAt(this.state.pos + 1);
    let nextnext = this.input.charCodeAt(this.state.pos + 2);
    if (next === code) {
      if (!this.state.inModule && next === 45 && nextnext === 62 && lineBreak.test(this.input.slice(this.state.prev.end, this.state.pos))) {
        // A `-->` line comment
        this.skipLineComment(3);
        this.skipNonTokens();
        return this.readNextToken();
      }
      this.state.pos += 2;
      return this.finishToken(tt.incDec, next === 45 ? '--' : '++');
    }
    if (next === 61) { // =
      if (code === 43 && nextnext === 62) { // +=>
        return this.finishArrow(3);
      }
      this.state.pos += 2;
      return this.finishToken(tt.assign, code === 45 ? "-=" : "+=");
    }
    if (next === 62) {
      return this.finishArrow()
    }
    ++this.state.pos;
    return this.finishToken(tt.plusMin, code === 45 ? "-" : "+");
  }

  readToken_semi() {
    if (this.input.charCodeAt(this.state.pos + 1) === 59) {
      this.state.pos += 2;
      return this.finishToken(tt.doublesemi); // ';;'
    } else {
      ++this.state.pos;
      return this.finishToken(tt.semi); // ';'
    }
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

  readToken_star() {
    // ensure that *=> is tokenized as star & `=>` arrow and not `*=` assign and relational `>`

    let start = this.state.pos;
    ++this.state.pos;
    let next = this.input.charCodeAt(this.state.pos);

    if (next === 61 && this.input.charCodeAt(this.state.pos + 1) !== 62) {
      ++this.state.pos;
      return this.finishToken(tt.eq, this.input.slice(start, this.state.pos));
    }
    return this.finishToken(tt.star);
  }

  // Read an identifier or keyword token
  readWord() {
    let word = this.readWordSingle();
    if (!this.state.containsEsc && this.keywords.test(word)) {
      return this.finishKeyword(word);
    }
    return this.finishToken(tt.name, {value: word, raw: this.input.slice(this.state.lex.start, this.state.pos)});
  }

  finishKeyword(word) {
    let type = keywordTypes[word];

    // if (type === tt._upto || type === tt._downto) {
    //   throw new Error("Not Implemented");
    //   if (this.input.charCodeAt(this.state.pos) === 61) { // upto=, downto=
    //     // TODO
    //   }
    // }

    return this.finishToken(type, word);
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
            this.raise(this.state.pos - 2, `Octal literal in ${inTemplate ? "template" : "strict mode"}`);
          }
          this.state.pos += octalStr.length - 1;
          return String.fromCharCode(octal);
        }
        return String.fromCharCode(ch);
    }
  }

  ////////////// Template Tokenization //////////////

  readTmplToken() {
    let out = "";
    let chunkStart = this.state.pos;
    for (;;) {
      if (this.state.pos >= this.input.length) this.raise(this.state.start, "Unterminated template");
      let ch = this.input.charCodeAt(this.state.pos);
      if (ch === 96 || ch === 36 && this.input.charCodeAt(this.state.pos + 1) === 123) { // '``', `${`
        if (this.state.pos === this.state.lex.start && this.state.prevLexType === tt.template) {
          if (ch === 36) {
            this.state.pos += 2;
            return this.finishToken(tt.dollarBraceL);
          } else {
            ++this.state.pos;
            return this.finishToken(tt.backQuote);
          }
        } else {
          out += this.input.slice(chunkStart, this.state.pos);
          return this.finishToken(tt.template, out);
        }
      } else if (ch === 92) {
        out += this.input.slice(chunkStart, this.state.pos);
        out += this.readEscapedChar(true);
        chunkStart = this.state.pos;
      } else if (isNewline(ch)) {
        out += this.input.slice(chunkStart, this.state.pos);
        ++this.state.pos;
        switch (ch) {
          case 13:
            if (this.input.charCodeAt(this.state.pos) === 10) ++this.state.pos;
            // fallthrough
          case 10:
            out += "\n";
            break;
          default:
            out += String.fromCharCode(ch);
        }
        ++this.state.curLine;
        this.state.lineStart = this.state.pos;
        chunkStart = this.state.pos;
      } else {
        ++this.state.pos;
      }
    }
  }

  ////////////// Token Storage //////////////

  // TODO: rename these to "store"

  endToken(token) {
    this.state.tokens.push(token);
    this.endSourceElementToken(token);
  }

  endNonToken(token) {
    this.endSourceElementToken(token);
  }

  endSourceElementToken(token) {
    this.state.sourceElementTokens.push(token);
  }
}
