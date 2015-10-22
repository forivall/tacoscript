import { TacoTokenType, keywords, types as tt } from "./types";
import includes from "lodash/collection/includes";

export class TacoToken {
  constructor(state) {
    this.type = state.type;
    this.value = state.value;
    this.start = state.start;
    this.end = state.end;
    this.meta = state.meta || {};
    // this.loc = new SourceLocation(state.startLoc, state.endLoc);
  }

  valueOf() {
    return this.type.toCode(this);
  }

  static from(babelToken) {
    let type = TacoTokenType.from(babelToken.type);
    let state = {
      type: type,
      value: type.convertValue(babelToken.value)
    };
    let token = new TacoToken(state);
    token.origLoc = babelToken.loc;
    token.origStart = babelToken.start;
    token.origEnd = babelToken.end;
    return token;
  }
  static _fromCodeCache = {};
  // should not be used on regex, etc.
  static stateFromCode(code) {
    // TODO: just use the tokenizer to do this
    // make sure to design the tokenizer to make this easy
    let cacheState = TacoToken._fromCodeCache[code];
    if (cacheState) return cacheState;

    for (let key in tt) {
      let type = tt[key];
      if (type.code === code) {
        return (TacoToken._fromCodeCache[code] = { type: type });
      }
    }
    switch (code) {
      case "=>":
      case "=>>":
        return (TacoToken._fromCodeCache[code] = { type: tt.arrow, value: code });
      case "->": case "->>":
        return (TacoToken._fromCodeCache[code] = { type: tt.unboundArrow, value: code });
      case "~>": case "~>>":
        return (TacoToken._fromCodeCache[code] = { type: tt.asyncArrow, value: code });
      case "~=>": case "~=>>":
        return (TacoToken._fromCodeCache[code] = { type: tt.asyncBoundArrow, value: code });
      case "+=": case "-=":
      case "/=": case "*=": case "**=": case "%=":
      case "|=": case "&=": case "^=":
      case "<<=": case ">>=": case ">>>=":
      case "or=": case "and=": case "?=":
        return (TacoToken._fromCodeCache[code] = { type: tt.assign, value: code });
      case "++": case "--":
        return (TacoToken._fromCodeCache[code] = { type: tt.incDec, value: code });
      case "==": case "===": case "!=": case "!==":
        return (TacoToken._fromCodeCache[code] = { type: tt.equality, value: code });
      case "<": case "<=": case ">": case ">=":
        return (TacoToken._fromCodeCache[code] = { type: tt.relational, value: code });
      case "<<": case ">>": case ">>>":
        return (TacoToken._fromCodeCache[code] = { type: tt.bitShift, value: code });
      case "+": case "-":
        return (TacoToken._fromCodeCache[code] = { type: tt.plusMin, value: code });
    }
    throw new Error(`Cannot construct token from code "${code}"`);
  }

  static fromCode(code) {
    return new TacoToken(TacoToken.stateFromCode(code));
  }
}
