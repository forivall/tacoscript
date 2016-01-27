import {tokTypes as tt} from "horchata";

export function extendFinishKeyword(inner) {
  return function(word) {
    if (word === "and" || word === "or") {
      if (this.input.charCodeAt(this.state.pos) === 61) { // and=, or=
        ++this.state.pos;
        return this.finishToken(tt.assign, (word === "and" ? "&&" : "||") + "=");
      }
    }
    return inner.call(this, word);
  }
}
