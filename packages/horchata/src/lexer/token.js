import {TokenType, types as tt} from "./types";
import {SourceLocation} from "../util/location";

export default class Token {
  constructor(type, value, start, end, startLoc, endLoc, parent = {}, meta = {}) {
    this.type = type;
    this.value = value;
    this.start = start;
    this.end = end;
    this.meta = meta;
    this.loc = new SourceLocation(parent, startLoc, endLoc);
    this.index = -1;
  }

  static fromCode(code) {
    return Token.fromState(Token.stateFromCode(code));
  }

  static fromState(spec) {
    let token = new Token(spec.type, spec.value,
      spec.start, spec.end, spec.startLoc, spec.endLoc, spec, spec.meta);
    token.index = spec.index;
    return token;
  }

  // static from(babelToken) {
  //   let type = TokenType.from(babelToken.type);
  //   let state = {
  //     type: type,
  //     value: type.convertValue(babelToken.value)
  //   };
  //   let token = new Token(state);
  //   token.origLoc = babelToken.loc;
  //   token.origStart = babelToken.start;
  //   token.origEnd = babelToken.end;
  //   return token;
  // }
  static _fromCodeCache = {};
  // should not be used on regex, etc.
  static stateFromCode(code) {
    // TODO: just use the tokenizer to do this
    // make sure to design the tokenizer to make this easy
    let cacheState = Token._fromCodeCache[code];
    if (cacheState) return cacheState;

    for (let key in tt) {
      let type = tt[key];
      if (type.code === code) {
        return (Token._fromCodeCache[code] = { type: type });
      }
    }
    switch (code) {
      case "=>": case "=>>":
      case "->": case "->>":
      case "+>": case "+>>":
      case "+=>": case "+=>>":
        return (Token._fromCodeCache[code] = { type: tt.arrow, value: code });
      case "+=": case "-=":
      case "/=": case "*=": case "**=": case "%=":
      case "|=": case "&=": case "^=":
      case "<<=": case ">>=": case ">>>=":
      case "or=": case "and=": case "?=":
        return (Token._fromCodeCache[code] = { type: tt.assign, value: code });
      case "++": case "--":
        return (Token._fromCodeCache[code] = { type: tt.incDec, value: code });
      case "==": case "===": case "!=": case "!==":
        return (Token._fromCodeCache[code] = { type: tt.equality, value: code });
      case "<": case "<=": case ">": case ">=":
        return (Token._fromCodeCache[code] = { type: tt.relational, value: code });
      case "<<": case ">>": case ">>>":
        return (Token._fromCodeCache[code] = { type: tt.bitShift, value: code });
      case "+": case "-":
        return (Token._fromCodeCache[code] = { type: tt.plusMin, value: code });
      case ";": return (Token._fromCodeCache[code] = { type: tt.semi });
      case ";;": return (Token._fromCodeCache[code] = { type: tt.doublesemi });
    }
    throw new Error(`Cannot construct token from code "${code}"`);
  }
}
