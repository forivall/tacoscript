import Tokenizer from "babylon/lib/tokenizer";
import State from "babylon/lib/tokenizer/state";
import { isKeyword } from "babylon/lib/util/identifier";
import isString from "lodash/isString";

var tokenizer = null;

export default function getToken(s, options) {
  if (!isString(s)) { return s; }
  if (tokenizer == null) { tokenizer = new MicroTokenizer(); }
  return tokenizer.getTokenFromString(s, options);
}

export class MicroTokenizer {
  constructor() {
    this.state = null;
    this.input = null;
    this.options = {};
    this.options.features = {};
    this.options.features["es7.exponentiationOperator"] = true;
  }

  getTokenFromString(input, stateOpts) {
    this.input = input;
    this.state = new State();
    this.state.init(input);
    Object.assign(this.state, stateOpts);

    this.skipSpace();

    if (this.state.comments.length > 0) {
      let comment = this.state.comments[0];
      this.state.type = comment.type;
      this.state.value = comment.value;
    } else if (this.state.pos >= this.input.length) {
      this.state.type = "Whitespace";
      this.state.value = input;
    } else {
      this.readToken(this.fullCharCodeAtPos());
    }

    // even though this function is called "getToken", we return the state
    // since we don't return a full token with source location etc., and the
    // state is what is used to generate a full token anyways.
    var state = this.state;
    this.state = null;

    return {
      type: state.type,
      value: state.value,
      source: input
    };
  }

  finishToken(type, val) {
    this.state.type = type;
    this.state.value = val;
    if (this.state.pos !== this.input.length) {
      if (this.triedTmplToken) {
        this.raise(0, "Did not consume entire string '" + this.input + "'");
      } else {
        this.state = new State();
        this.state.init(this.input);
        try {
          this.readTmplToken();
        } catch (e) {
          this.raise(0, "Could not consume entire string '" + this.input + "'");
        }
      }
    }
  }

  addComment(/*comment*/) {}

  nextToken() {
    if (this.state.pos >= this.input.length) { return; }
    this.raise(0, "Did not consume entire string '" + this.input + "'");
  }

  raise(pos, message) {
    throw new SyntaxError(message);
  }
}

MicroTokenizer.prototype.isKeyword = isKeyword;
MicroTokenizer.prototype.readToken = Tokenizer.prototype.readToken;
MicroTokenizer.prototype.getTokenFromCode = Tokenizer.prototype.getTokenFromCode;
MicroTokenizer.prototype.fullCharCodeAtPos = Tokenizer.prototype.fullCharCodeAtPos;
MicroTokenizer.prototype.readNumber = Tokenizer.prototype.readNumber;
MicroTokenizer.prototype.readInt = Tokenizer.prototype.readInt;
MicroTokenizer.prototype.readRadixNumber = Tokenizer.prototype.readRadixNumber;
MicroTokenizer.prototype.readString = Tokenizer.prototype.readString;
MicroTokenizer.prototype.readWord = Tokenizer.prototype.readWord;
MicroTokenizer.prototype.readWord1 = Tokenizer.prototype.readWord1;
MicroTokenizer.prototype.readRegexp = Tokenizer.prototype.readRegexp;
MicroTokenizer.prototype.readEscapedChar = Tokenizer.prototype.readEscapedChar;
MicroTokenizer.prototype.readHexChar = Tokenizer.prototype.readHexChar;
MicroTokenizer.prototype.readCodePoint = Tokenizer.prototype.readCodePoint;
MicroTokenizer.prototype.readToken_dot = Tokenizer.prototype.readToken_dot;
MicroTokenizer.prototype.readToken_slash = Tokenizer.prototype.readToken_slash;
MicroTokenizer.prototype.readToken_mult_modulo = Tokenizer.prototype.readToken_mult_modulo;
MicroTokenizer.prototype.readToken_pipe_amp = Tokenizer.prototype.readToken_pipe_amp;
MicroTokenizer.prototype.readToken_caret = Tokenizer.prototype.readToken_caret;
MicroTokenizer.prototype.readToken_plus_min = Tokenizer.prototype.readToken_plus_min;
MicroTokenizer.prototype.readToken_lt_gt = Tokenizer.prototype.readToken_lt_gt;
MicroTokenizer.prototype.readToken_eq_excl = Tokenizer.prototype.readToken_eq_excl;
MicroTokenizer.prototype.finishOp = Tokenizer.prototype.finishOp;
MicroTokenizer.prototype.readTmplToken = Tokenizer.prototype.readTmplToken;
MicroTokenizer.prototype.match = function() { return true; };

MicroTokenizer.prototype.skipSpace = Tokenizer.prototype.skipSpace;
MicroTokenizer.prototype.pushComment = Tokenizer.prototype.pushComment;
MicroTokenizer.prototype.skipLineComment = Tokenizer.prototype.skipLineComment;
MicroTokenizer.prototype.skipBlockComment = Tokenizer.prototype.skipBlockComment;
