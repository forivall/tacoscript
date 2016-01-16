
import forOwn from "lodash/object/forOwn";
import includes from "lodash/collection/includes";
import {types as tt, keywords} from "./types";
import {reservedWords} from "../util/identifier";
import {tokTypes as btt} from "babylon";
import toFastProperties from "to-fast-properties";
import repeating from "repeating";

// helper for looking up token types
// export const key = new Symbol("TokenTypeKey");
//
// update the lookup helper
export function added() {
  forOwn(tt, function(tokType, keyStr) {
    // tokType[key] = keyStr;
    tokType.key = keyStr;
    if (!tokType.babylonName) {
      tokType.babylonName = keyStr;
    }
  });
  // forOwn(btt, function(tokType, keyStr) {
  //   tokType.key = keyStr;
  // });
}

export function from(babelTokenType) {
  throw new Error("Not Implemented");
}

// set up serialization

tt.eof.code = "";
tt.newline.code = "\n";
tt.bracketL.code = "[";
tt.bracketR.code = "]";
tt.braceL.code = "{";
tt.braceR.code = "}";
tt.parenL.code = "(";
tt.parenR.code = ")";
tt.comma.code = ",";
tt.semi.code = ";";
tt.doublesemi.code = ";;";
tt.colon.code = ":";
tt.doubleColon.code = "::";
tt.dot.code = ".";
tt.question.code = "?";
tt.soak.code = "?.";
tt.ellipsis.code = "...";
tt.backQuote.code = "`";
tt.dollarBraceL.code = "${";
tt.at.code = "@";
tt.excl.code = "!";
tt.backslash.code = "\\";
tt.eq.code = "=";
tt.bitwiseNOT.code = "~";
tt.bitwiseOR.code = "|";
tt.bitwiseXOR.code = "^";
tt.bitwiseAND.code = "&";
tt.modulo.code = "%";
tt.star.code = "*";
tt.slash.code = "/";
tt.exponent.code = "*";

tt.blockCommentStart.code = "#*";
tt.blockCommentEnd.code = "*#";
tt.lineCommentStart.toCode = function(token) { return token.value.code || "#"; };

tt.whitespace.toCode = function(token) { return token.value.code; };
tt.num.toCode = function(token) { return token.value.code || token.value.raw || ("" + token.value.value); };
tt.regexp.toCode = function(token) { return token.value.code || token.value.raw || ('/' + token.value.pattern + '/' + token.value.flags); };
tt.string.toCode = function(token) { return token.value.code || token.value.raw || JSON.stringify(token.value.value); };
tt.template.toCode = function(token) { return token.value.raw; };
tt.name.toCode = function(token, state) {
  // TODO: keyword conflict resolution
  let code = token.value.code || token.value.raw || token.value.value;
  if ((keywords.hasOwnProperty(code) || includes(reservedWords.strict, code)) && token.value.standalone) code = "\\$" + code;
  return code;
};
tt.tab.toCode = function(token, state) {
  return token.value ? repeating(state.format.indent.indent, token.value) : "";
};
tt.indent.toCode = function(token, state) {
  // marker to parser that indentation has increased
  return "";
};
tt.dedent.toCode = function(token, state) {
  // marker to parser that indentation has decreased
  return "";
};

tt.lineCommentBody.toCode = function(token) {
  return token.value.code;
};
tt.blockCommentBody.toCode = function(token) {
  return token.value.code;
};

// NOTE: proper serialization of an invalid stream of tokens is not guaranteed.

// spacing required for proper parsing

forOwn(keywords, function(keywordType) {
  keywordType.forceSpaceWhenAfter.keyword = true;
  keywordType.forceSpaceWhenAfter.name = true;
  keywordType.forceSpaceWhenAfter.num = true;
  keywordType.forceSpaceWhenAfter.string = true;
});
tt.incDec.forceSpaceWhenAfter.plusMin = function(left, right) {
  return (left.value === "+" && right.value === "++") ||
    (left.value === "-" && right.value === "--");
};
tt.name.forceSpaceWhenAfter.keyword = true;
tt.name.forceSpaceWhenAfter.name = true;
tt.num.forceSpaceWhenAfter.keyword = true;
tt.plusMin.forceSpaceWhenAfter.plusMin = function(left, right) {
  return (
    left.value === "+" && right.value === "++" ||
    left.value === "-" && right.value === "--" ||
    left.value === "+" && right.value === "+" ||
    left.value === "-" && right.value === "-" ||
    false
  );
};
tt.relational.forceSpaceWhenAfter.incDec = function(left, right) {
  // http://javascript.spec.whatwg.org/#comment-syntax
  // TODO: not necessary if generating for module mode
  return left.value === "--" && right.value === ">";
};
tt.incDec.forceSpaceWhenAfter.excl = function(left, right) {
  // TODO: not necessary if generating for module mode
  return right.value === "--";
}
tt.string.forceSpaceWhenAfter.keyword = true;

// formatting : todo: move to plugin

forOwn(keywords, function(keywordType) {
  keywordType.formattingSpaceWhenAfter.bracketR = true;
  keywordType.formattingSpaceWhenAfter.braceR = true;
  keywordType.formattingSpaceWhenAfter.comma = true;
  keywordType.formattingSpaceWhenAfter.incDec = true;
  keywordType.formattingSpaceWhenAfter.parenR = true;
});

tt.plusMin.formattingSpaceAfter = function(left, right) { return !left.meta.unary; };
tt.plusMin.formattingSpaceWhenAfter.name = true;
tt.plusMin.formattingSpaceWhenAfter.num = true;
tt.plusMin.formattingSpaceWhenAfter.parenR = true;
tt.plusMin.formattingSpaceWhenAfter.string = true;
tt.plusMin.formattingSpaceWhenAfter.backQuote = true;
tt.star.formattingSpaceWhenAfter._export = true;
tt.star.formattingSpaceWhenAfter._import = true;
tt.star.formattingSpaceWhenAfter.name = true;
tt.star.formattingSpaceWhenAfter.num = true;
tt.star.formattingSpaceWhenAfter.parenR = true;
tt.star.formattingSpaceWhenAfter.bracketR = true;
tt.star.formattingSpaceWhenAfter.string = true;
tt.star.formattingSpaceWhenAfter.backQuote = true;
tt.star.formattingSpaceAfter = function(left, right) {
  return right.type !== tt.arrow;
};
for (let tokenType of [
      tt.slash, tt.modulo, tt.assign,
      tt.bitShift, tt.bitwiseAND, tt.bitwiseOR, tt.bitwiseXOR,
      tt.equality, tt.relational
    ]) {
  tokenType.formattingSpaceWhenAfter.name = true;
  tokenType.formattingSpaceWhenAfter.num = true;
  tokenType.formattingSpaceWhenAfter.parenR = true;
  tokenType.formattingSpaceWhenAfter.string = true;
  tokenType.formattingSpaceAfter = true;
}

tt._from.formattingSpaceWhenAfter.braceR = true;
tt._of.formattingSpaceWhenAfter.braceR = true;
tt.arrow.formattingSpaceAfter = function(left, right) {
  return (
    right.type !== tt.parenR &&
    right.type !== tt.newline &&
    right.type !== tt.comma &&
  true);
};
tt.arrow.formattingSpaceWhenAfter.parenR = true;
tt.bracketL.formattingSpaceWhenAfter.arrow = true;
tt.bracketL.formattingSpaceWhenAfter.comma = true;
tt.bracketL.formattingSpaceWhenAfter.eq = true;
tt.bracketL.formattingSpaceWhenAfter.keyword = function(left) {
  return (
    left.type !== tt._super &&
    left.type !== tt._this &&
    true
  );
};
tt.braceL.formattingSpaceWhenAfter.arrow = true;
tt.braceL.formattingSpaceWhenAfter.comma = true;
tt.braceL.formattingSpaceWhenAfter.keyword = true;
tt.colon.formattingSpaceAfter = true;
// tt.comma.formattingSpaceAfter = true;
tt.incDec.formattingSpaceWhenAfter.keyword = true;
tt.ellipsis.formattingSpaceWhenAfter.comma = true;
tt.doublesemi.formattingSpaceWhenAfter.doublesemi = true;
tt.doublesemi.formattingSpaceWhenAfter._then = true;
tt.doublesemi.formattingSpaceAfter = true;
tt.eq.formattingSpaceAfter = true;
tt.eq.formattingSpaceWhenAfter.name = true;
tt.eq.formattingSpaceWhenAfter.braceR = true;
tt.eq.formattingSpaceWhenAfter.bracketR = true;
tt.name.formattingSpaceWhenAfter.arrow = true;
tt.name.formattingSpaceWhenAfter.backQuote = true;
tt.name.formattingSpaceWhenAfter.comma = true;
tt.name.formattingSpaceWhenAfter.excl = true;
tt.num.formattingSpaceWhenAfter.arrow = true;
tt.num.formattingSpaceWhenAfter.comma = true;
tt.num.formattingSpaceWhenAfter.excl = true;
tt.parenL.formattingSpaceWhenAfter.arrow = true;
tt.parenL.formattingSpaceWhenAfter.comma = true;
tt.parenL.formattingSpaceWhenAfter.excl = true;
tt.parenL.formattingSpaceWhenAfter.keyword = function(left) {
  return left.type !== tt._super;
};
tt.regexp.formattingSpaceWhenAfter.keyword = true;
tt.semi.formattingSpaceAfter = true;
tt.star.formattingSpaceWhenAfter.comma = true;
tt.string.formattingSpaceWhenAfter.arrow = true;
tt.string.formattingSpaceWhenAfter.comma = true;

added();
