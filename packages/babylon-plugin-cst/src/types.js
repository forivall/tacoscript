
import { types as tt, TokenType } from "babylon/lib/tokenizer/types";
import forOwn from "lodash/object/forOwn";

// TODO: create and export actual token types for these.
export const tokenTypes = {
  newline: new TokenType("newline"),
  whitespace: new TokenType("whitespace"),
  blockCommentStart: new TokenType("/*"),
  blockCommentBody: new TokenType("blockCommentBody"),
  blockCommentEnd: new TokenType("*/"),
  lineCommentStart: new TokenType("//"),
  lineCommentBody: new TokenType("lineCommentBody"),
};
forOwn(tokenTypes, function(tokenType) {
  tokenType.whitespace = true;
});

const ttCst = tokenTypes;

export const tokenToName = new Map();
for (let name in tt) { tokenToName.set(tt[name], name); }
for (let name in ttCst) { tokenToName.set(ttCst[name], name); }
