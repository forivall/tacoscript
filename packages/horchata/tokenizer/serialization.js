
import forOwn from "lodash/object/forOwn";
import { types as tt } from "./types";
import { tokTypes as btt } from "babylon";
import keywordCodeFunctions from "./_keywordSerialization";
import toFastProperties from "to-fast-properties";

// helper for looking up token types
// export const key = new Symbol("TokenTypeKey");
//
// update the lookup helper
export function added() {
  forOwn(types, function(tokType, keyStr) {
    // tokType[key] = keyStr;
    tokType.key = keyStr;
    if (!tokType.babylonName) {
      tokType.babylonName = keyStr;
    }
  });
  // forOwn(btt, function(tokType, keyStr) {
  //   tokType[key] = keyStr;
  // });
}

export function init() {
  // added();
  tt.eof.code = "";
  tt.bracketL.code = "[";
  tt.bracketR.code = "]";
  tt.braceL.code = "{";
  tt.braceR.code = "}";
  tt.parenL.code = "(";
  tt.parenR.code = ")";
  tt.comma.code = ",";
  tt.semi.code = ";";
  tt.colon.code = ":";
  tt.doubleColon.code = "::";
  tt.dot.code = ".";
  tt.question.code = "?";
  tt.soak.code = "?.";
  tt.ellipsis.code = "...";
  tt.backQuote.code = "`";
  tt.dollarBraceL.code = "${";
  tt.at.code = "@";
  tt.exec.code = "!";
  tt.backslash.code = "\\";
  tt.eq.code = "=";
  tt.bitwiseOR.code = "|";
  tt.bitwiseXOR.code = "^";
  tt.bitwiseAND.code = "&";
  tt.modulo.code = "%";
  tt.star.code = "*"
  tt.slash.code = "/";
  tt.exponent.code = "*";

  // NOTE: proper serialization of invalid taco/javascript is not guaranteed.
  tt.num.forceSpaceWhenAfter.keyword = true;
  toFastProperties(tt.num.forceSpaceWhenAfter);

  tt.incDec.forceSpaceWhenAfter.plusMin = function(left, right) {
    return (left.value === "+" && right.value === "++") ||
      (left.value === "-" && right.value === "--");
  };
  tt.plusMin.forceSpaceWhenAfter.plusMin = function(left, right) {
    return (left.value === "+" && right.value === "++") ||
      (left.value === "-" && right.value === "--");
  };
  toFastProperties(tt.prefix.forceSpaceWhenAfter);
}
