import {lineBreak} from "../util/whitespace";

// Comment formatting metadata

export const blockCommentMeta = {
  "#*": {
    terminator: "*#",
    terminatorRe: /\*#/,
    terminatorSub: "*$1#",
    terminatorSubRe: /\*( *)#/g,
    terminatorEscapeSub: "* $1#",
    terminatorEscapeSubRe: /\* ( *)#/g,
    isCanonical: true, // this is the only block comment type that will be included in generation
    startLen: 2,
    endLen: 2
  },
  // formatting directives
  "#%": {
    terminator: "%#",
    terminatorRe: /%#/,
    startLen: 2,
    endLen: 2
  },
  // commented code. Will _not_ be included in cst
  "###": {
    terminator: "###",
    terminatorRe: new RegExp(lineBreak.source + "###"),
    startLen: 3,
    endLen: 3
  },
  "/*": {
    terminator: "*/",
    terminatorRe: /\*\//,
    terminatorSub: "*$1/",
    terminatorSubRe: /\*( *)\//g,
    terminatorEscapeSub: "* $1/",
    terminatorEscapeSubRe: /\* ( *)\//g,
    startLen: 2,
    endLen: 2,
    isJs: true
  }
};
