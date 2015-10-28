/* @flow */

import { init as initSerialization } from "./serialization";

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All keyword token type variables start with an underscore, to make them
// easy to recognize.

// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// The `startsExpr` property is used to indicate when a token starts
// any type of expression statement.
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.
//
// `continuesExpression` marks a token that, if it is the last token before
// a newline, the expression will continue

export class TacoTokenType {
  constructor(label, alias, conf = {}) {
    // metadata
    this.label = label;
    this.alias = alias; // esprima style token name
    this.keyword = conf.keyword;
    this.code = conf.code;
    this.babylonName = conf.babylonName;

    // parsing
    this.beforeExpr = !!conf.beforeExpr;
    this.startsExpr = !!conf.startsExpr;
    this.startsArguments = !!conf.startsArguments;
    this.continuesExpression = !!conf.continuesExpression;
    this.continuesPreviousLine = !!conf.continuesPreviousLine;
    // operator precedence parsing
    this.rightAssociative = !!conf.rightAssociative;
    this.isLoop = !!conf.isLoop;
    this.isAssign = !!conf.isAssign;
    this.prefix = !!conf.prefix;
    this.postfix = !!conf.postfix;
    this.binop = conf.binop || null;
    this.updateContext = null; // for jsx parsing

    // serialization
    this.forceSpaceWhenAfter = {};
    this.formattingSpaceAfter = false;
    this.formattingSpaceWhenAfter = {};
  }
  toCode(token) { return "" + (this.code || token.value); }
}

function binop(name, prec) {
  return new TacoTokenType(name, "Punctuator", {beforeExpr: true, binop: prec});
}
function punctuator(name, conf) {
  return new TacoTokenType(name, "Punctuator", conf)
}

// Map keyword names to token types.
export const keywords = {};

// Succinct definitions of keyword token types
let kw = function kw(name, options = {}) {
  options.keyword = name;
  options.code = name;
  let type = new TacoTokenType(name, "Keyword", options);
  keywords[name] = type;
  return type;
}
const
  beforeExpr = {beforeExpr: true},
  startsExpr = {startsExpr: true},
  continuesPreviousLine = {continuesPreviousLine: true},
  isLoop = {isLoop: true};

export const types = {
  num: new TacoTokenType("num", "Numeric", startsExpr),
  // value in format {}
  regexp: new TacoTokenType("regexp", "RegularExpression", startsExpr),
  string: new TacoTokenType("string", "String", startsExpr),
  name: new TacoTokenType("name", "Identifier", startsExpr),

  eof: new TacoTokenType("eof", "EOF"),
  tab: new TacoTokenType("tab", "Whitespace"),
  indent: new TacoTokenType("indent", "Whitespace"),
  dedent: new TacoTokenType("dedent", "Whitespace"),
  whitespace: new TacoTokenType("whitespace", "Whitespace"),
  newline: new TacoTokenType("newline", "Whitespace"),

  blockCommentStart: new TacoTokenType("#*", "Comment"),
  blockCommentBody: new TacoTokenType("blockcomment", "Comment"),
  blockCommentEnd: new TacoTokenType("*#", "Comment"),
  lineCommentStart: new TacoTokenType("#", "Comment"),
  lineCommentBody: new TacoTokenType("linecomment", "Comment"),

  // Punctuation token types.
  bracketL:     punctuator("[",  {beforeExpr: true, startsExpr: true}),
  bracketR:     punctuator("]"),
  braceL:       punctuator("{",  {beforeExpr: true, startsExpr: true}),
  braceR:       punctuator("}"),
  parenL:       punctuator("(",  {beforeExpr: true, startsExpr: true}),
  parenR:       punctuator(")"),
  comma:        punctuator(",",   beforeExpr),
  semi:         punctuator(";",   beforeExpr),
  colon:        punctuator(":",   beforeExpr),
  doubleColon:  punctuator("::",  beforeExpr),
  dot:          punctuator(".", continuesPreviousLine),
  // TODO: eventually use ? as a null coalescing operator, like c#
  question:     punctuator("?",   beforeExpr), // only used by flow
  soak:         punctuator("?.", continuesPreviousLine),
  soakBracketL: punctuator("?[", continuesPreviousLine),
  // also includes =>>, ->>, ~>>
  arrow:        punctuator("=>", {beforeExpr: true, startsExpr: true}),
  unboundArrow: punctuator("->", {beforeExpr: true, startsExpr: true}),
  asyncArrow:   punctuator("~>", {beforeExpr: true, startsExpr: true}),
  asyncBoundArrow:punctuator("~=>", {beforeExpr: true, startsExpr: true}),
  template:     new TacoTokenType("template", "Template"),
  ellipsis:     punctuator("...", beforeExpr),
  backQuote:    punctuator("`",   startsExpr),
  dollarBraceL: punctuator("${", {beforeExpr: true, startsExpr: true}),
  at:           punctuator("@"),
  exec:         punctuator("!",  {postfix: true, startsArguments: true}),
  backslash:    punctuator("\\", {continuesExpression: true}),

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  eq:         punctuator("=", {beforeExpr: true, isAssign: true}),
  assign:     punctuator("_=", {beforeExpr: true, isAssign: true}),
  incDec:     punctuator("++/--", {prefix: true, postfix: true, startsExpr: true}),
  bitwiseNOT: punctuator("~", {beforeExpr: true, prefix: true, startsExpr: true, babylonName: "prefix", babylonValue: "~"}),
  _not:               kw("not", {beforeExpr: true, prefix: true, startsExpr: true, babylonName: "prefix", babylonValue: "!"}),
  _or:                kw("or", {binop: 1, babylonName: "logicalOR", babylonValue: "||"}),
  _and:               kw("and", {binop: 2, babylonName: "logicalAND", babylonValue: "&&"}),
  bitwiseOR:       binop("|", 3),
  bitwiseXOR:      binop("^", 4),
  bitwiseAND:      binop("&", 5),
  // Either form of equality (is/isnt/like/unlike or ===/!==/==/!=) are parsable,
  // but one or the other is always generated. is/isnt/like/unlike is the default.
  // TODO: throw an error when mixing types.
  _is:                kw("is", {binop: 6, babylonName: "equality", babylonValue: "==="}),
  // possible alternative: notis, however, discussion on frappe agrees that isnt is fine.
  _isnt:              kw("isnt", {binop: 6, babylonName: "equality", babylonValue: "!=="}),
  _like:              kw("like", {binop: 6, babylonName: "equality", babylonValue: "=="}),
  _unlike:            kw("unlike", {binop: 6, babylonName: "equality", babylonValue: "!="}),
  equality:        binop("==", 6),
  relational:      binop("</>", 7),
  _in:                kw("in", {beforeExpr: true, binop: 7}),
  _instanceof:        kw("instanceof", {beforeExpr: true, binop: 7}),
  bitShift:        binop("<</>>", 8),
  plusMin:    punctuator("+/-", "Punctuator", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
  modulo:          binop("%", 10),
  positiveModulo:  binop("%%", 10), // See lydell/frappe '"useful" modulo'
  star:            binop("*", 10),
  slash:           binop("/", 10),
  exponent:   punctuator("**", {beforeExpr: true, binop: 11, rightAssociative: true}),
};

kw = function kw(name, options = {}) {
  options.keyword = name;
  options.code = name;
  let type = new TacoTokenType(name, "Keyword", options);
  types["_" + name] = keywords[name] = type;
}

kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true});
kw("void", {beforeExpr: true, prefix: true, startsExpr: true});
kw("delete", {beforeExpr: true, prefix: true, startsExpr: true});
// declarations
kw("var");
kw("let");
kw("const");
kw("extern");
kw("function"); // startsExpr // in tacoscript, function is only used as a declaration
// control flow
kw("then", {beforeExpr: true, startsExpr: true});
kw("if");
kw("else", beforeExpr);
kw("switch");
kw("case", beforeExpr);
kw("default", beforeExpr);
// iteration
kw("for", isLoop);
kw("update", beforeExpr);
kw("upto", beforeExpr);
kw("downto", beforeExpr);
kw("while", isLoop);
kw("do", isLoop);
kw("continue");
kw("break");
kw("return", beforeExpr);
// exceptions
kw("throw", beforeExpr);
kw("try");
kw("catch");
kw("finally");
// blocks
kw("with");
// expression modifiers
kw("new", {beforeExpr: true, startsExpr: true});
kw("yield", {beforeExpr: true, startsExpr: true});
// classes
kw("static");
kw("class");
kw("extends", beforeExpr);
kw("get");
kw("set");
// modules
kw("export");
kw("import");
kw("from");
kw("as");
// special types
kw("null", startsExpr);
kw("true", startsExpr);
kw("false", startsExpr);
kw("this", startsExpr);
kw("super", startsExpr);

kw("debugger");
kw("pass");

initSerialization();
