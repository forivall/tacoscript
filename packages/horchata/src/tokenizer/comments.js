import {lineBreak} from "../util/whitespace";

export const blockCommentMeta = {
  "#*": {
    terminator: "*#",
    terminatorRe: /\*#/,
    terminatorSub: "*$1#",
    terminatorSubRe: /\*( *)#/g,
    terminatorEscapeSub: "* $1#",
    terminatorEscapeSubRe: /\* ( *)#/g,
    isCanonical: true // this is the only block comment type that will be included in generation
  },
  // formatting directives
  "#%": {
    terminator: "%#",
    terminatorRe: /%#/,
  },
  // commented code. Will _not_ be included in cst
  "###": {
    terminator: "###",
    terminatorRe: new RegExp(lineBreak.source + "###"),
  },
  "/*": {
    terminator: "*/",
    terminatorRe: /\*\//,
    terminatorSub: "*$1/",
    terminatorSubRe: /\*( *)\//g,
    terminatorEscapeSub: "* $1/",
    terminatorEscapeSubRe: /\* ( *)\//g,
    isJs: true
  }
};
