import { TacoTokenType, keywords, types as tt } from "./types";
import includes from "lodash/collection/includes";

export class TacoToken {
  constructor(state) {
    this.type = state.type;
    this.value = state.value;
    this.start = state.start;
    this.end = state.end;
    this.loc = new SourceLocation(state.startLoc, state.endLoc);
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

    for (let type in tt) {
      if (type.code === code) {
        return (TacoToken._fromCodeCache[code] = { type: type });
      }
    }
    if (code === "=>" || code === "=>>") {
      return (TacoToken._fromCodeCache[code] = { type: tt.arrow, value: code });
    }
    if (code === "->" || code === "->>") {
      return (TacoToken._fromCodeCache[code] = { type: tt.unboundArrow, value: code });
    }
    if (code === "~>" || code === "~>>") {
      return (TacoToken._fromCodeCache[code] = { type: tt.asyncArrow, value: code });
    }
    if (code === "+=" || code === "-=" ||
        code === "/=" || code === "*=" || code === "**=" || code === "%=" ||
        code === "|=" || code === "&=" || code === "^=" ||
        code === "<<=" || code === ">>=" || code === ">>>=" ||
        code === "or=" || code === "and=" || code === "?=") {
      return (TacoToken._fromCodeCache[code] = { type: tt.assign, value: code });
    }
    if (code === "++" || code === "--") {
      return (TacoToken._fromCodeCache[code] = { type: tt.incDec, value: code });
    }
    if (code === "==" || code === "===" || code === "!=" || code === "!==") {
      return (TacoToken._fromCodeCache[code] = { type: tt.equality, value: code });
    }
    if (code === "<" || code === "<=" || code === ">" || code === ">=") {
      return (TacoToken._fromCodeCache[code] = { type: tt.relational, value: code });
    }
    if (code === "<<" || code === ">>" || code === ">>>") {
      return (TacoToken._fromCodeCache[code] = { type: tt.bitShift, value: code });
    }
    if (code === "+" || code === "-") {
      return (TacoToken._fromCodeCache[code] = { type: tt.plusMin, value: code });
    }
    throw new Error(`Cannot construct token from code "${code}"`);
  }

  static fromCode(code) {
    return new TacoToken(TacoToken.stateFromCode(code));
  }
}
