import {tokTypes as tt} from "horchata";


function isWordy(left, right) {
  return right.value === "&&=" || right.value === "||=";
}

// TODO: improve this pattern
export const tokType = {
  assign: {
    toCode(token, state) {
      if (token.value === "&&=") return "and=";
      if (token.value === "||=") return "or=";
    },
    forceSpaceWhenAfter: {
      name: isWordy,
      keyword: isWordy,
      num: isWordy,
    }
  }
}
