import {TokenType, tokTypes as tt, TokContext} from "horchata";

export const tokenTypes = {
  iifeBindFlag: new TokenType("=flag", "Punctuator"),
  iifeAsyncFlag: new TokenType("+flag", "Punctuator"),
};

export const contextTypes = {
  with_flags: new TokContext("with", false, false, (lexer) => lexer.readIifeFlagToken(lexer.fullCharCodeAtPos())),
};

export const updateContext = {
  _with(inner) {
    return function(type, prevType) {
      this.state.context.push(contextTypes.with_flags);
      return inner.call(this, type, prevType);
    }
  },

  excl(inner) {
    return function(type, prevType) {
      if (prevType === tt._with) {
        this.state.context.pop();
        this.state.exprAllowed = true;
      }
      return inner.call(this, type, prevType);
    }
  },

  braceL(inner) {
    return function(type, prevType) {
      if (this.curContext() === contextTypes.with_flags) {
        this.state.context.pop();
      }
      return inner.call(this, type, prevType);
    }
  },
};

export function readIifeFlagToken(code) {
  switch (code) {
    case 33: return this.readToken_excl(); // '!'
    case 123: ++this.state.pos; return this.finishToken(tt.braceL);  // '{'
    case 42: ++this.state.pos; return this.finishToken(tt.star); // '*'
    case 43: ++this.state.pos; return this.finishToken(tt.iifeAsyncFlag); // '+'
    case 61: ++this.state.pos; return this.finishToken(tt.iifeBindFlag); // '='
  }
  this.raise(this.state.pos, `Unexpected character '${codePointToString(code)}' (${code})`);
}
