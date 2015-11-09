import { types as tt } from "../../tokenizer/types";

// this file is roughly equivalent to lval from acorn and babylon

// this differs from acorn and babylon in that this function checks the token's
// type so that custom lval patterns can be invented. If someone wants to do
// that. >_<

export function toAssignable(node, tokType) {
  if (tokType === tt.eq) {
    throw new Error("Not Implemented");
  }
  return node;
}
