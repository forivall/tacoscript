/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015-2017 Emily Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All keyword token type variables start with an underscore, to make them
// easy to recognize.

// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression). See [`context.js`](./context.js).
//
// The `continuesExpr` property is also used to disambiguate
// whether or not a newline must be escaped to continue an expression,
// and if extended indentation is required to continue an expression
// in statement headers like `if` and `while`.
//
// The `startsExpr` property is used to indicate when a token starts
// any type of expression statement. See [`context.js`](./context.js).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.
//
// `continuesPreviousLine` marks a token that, if it is the first token in a
// new line, preceding newlines and indents are ignored (indents still must
// be consistent)
// TODO: add consistent lookahead for continuesPreviousLine.

export class TokenType {
  constructor(label, alias, conf = {}) {
    // metadata
    this.label = label;
    this.alias = alias; // esprima style token name
    this.keyword = conf.keyword;
    this.code = conf.code;
    this.babylonName = conf.babylonName;
    this.estreeValue = conf.estreeValue || null;

    // parsing
    this.beforeExpr = !!conf.beforeExpr;
    this.continuesExpr = !!conf.continuesExpr;
    this.startsExpr = !!conf.startsExpr;
    this.startsStmt = !!conf.startsStmt;
    this.startsArguments = !!conf.startsArguments;
    this.continuesPreviousLine = !!conf.continuesPreviousLine;
    // operator precedence parsing
    this.rightAssociative = !!conf.rightAssociative;
    this.isLoop = !!conf.isLoop;
    this.isAssign = !!conf.isAssign;
    this.prefix = !!conf.prefix;
    this.postfix = !!conf.postfix;
    this.binop = conf.binop || null;
    // TODO: allow specifiying custom binops via plugins, that can plug into the OPP
    this.binopRequiresPlugin = conf.binopRequiresPlugin || false;
    if (this.binop != null) this.binopExpressionName = conf.binopExpressionName || "BinaryExpression";
    this.updateContext = null;

    // serialization
    this.forceSpaceWhenAfter = {};
    this.formattingSpaceAfter = false;
    this.formattingSpaceWhenAfter = {};
  }
  toCode(token) { return "" + (this.code || token.value); }
}

function binop(name, prec) {
  return new TokenType(name, "Punctuator", {beforeExpr: true, continuesExpr: true, binop: prec});
}
function punctuator(name, conf) {
  return new TokenType(name, "Punctuator", conf)
}

// Map keyword names to token types.
export const keywords = {};

// Succinct definitions of keyword token types
let kw = function kw(name, options = {}, alias = "Keyword") {
  options.keyword = name;
  options.code = name;
  let type = new TokenType(name, alias, options);
  keywords[name] = type;
  return type;
}
const
  beforeExpr = {beforeExpr: true},
  startsExpr = {startsExpr: true},
  startsStmt = {startsStmt: true},
  continuesPreviousLine = {continuesPreviousLine: true},
  loopHeader = {beforeExpr: true, startsExpr: true, isLoop: true};

export const types = {
  num: new TokenType("num", "NumericLiteral", startsExpr),
  // value in format {}
  regexp: new TokenType("regexp", "RegularExpressionLiteral", startsExpr),
  string: new TokenType("string", "StringLiteral", startsExpr),
  name: new TokenType("name", "IdentifierName", startsExpr),

  eof: new TokenType("eof", "EOF"),
  unknown: new TokenType("unknown"), // for fixed lookahead
  tab: new TokenType("tab", "WhiteSpaceLeading"),
  indent: new TokenType("indent", "Indent"),
  dedent: new TokenType("dedent", "Dedent"),
  whitespace: new TokenType("whitespace", "WhiteSpace"),
  newline: new TokenType("newline", "LineTerminator", {beforeExpr: true, continuesExpr: true}),

  blockCommentStart: new TokenType("#*", "CommentHead"),
  blockCommentBody: new TokenType("blockcomment", "CommentBody"),
  blockCommentEnd: new TokenType("*#", "CommentTail"),
  lineCommentStart: new TokenType("#", "CommentHead"),
  lineCommentBody: new TokenType("linecomment", "CommentBody"),

  // Punctuation token types.
  bracketL:     punctuator("[",  {beforeExpr: true, startsExpr: true}),
  bracketR:     punctuator("]"),
  braceL:       punctuator("{",  {beforeExpr: true, startsExpr: true}),
  braceR:       punctuator("}"),
  parenL:       punctuator("(",  {beforeExpr: true, startsExpr: true}),
  parenR:       punctuator(")"),
  comma:        punctuator(",",   beforeExpr),
  semi:         punctuator(";",   {beforeExpr: true, continuesExpr: true}), // double semicolons are used like single semicolons.
  doublesemi:   punctuator(";;",   beforeExpr), // single semicolons are used for sequence expressions in tacoscript
  colon:        punctuator(":",   {beforeExpr: true, continuesExpr: true}),
  doubleColon:  punctuator("::",  {beforeExpr: true, continuesExpr: true}),
  dot:          punctuator(".", continuesPreviousLine),

  // TODO: ? is a null coalescing operator, like c#. Also used by flow
  question:     punctuator("?",   {beforeExpr: true, continuesExpr: true}), // only used by flow
  // TODO: ?., ?[ are soak coalescing prop access operators, like coffeescript
  soak:         punctuator("?.", continuesPreviousLine),
  soakBracketL: punctuator("?[", continuesPreviousLine),
  // TODO: ?(, ?! is the soak coalescing call operators, like coffeescript
  soakParenL:   punctuator("?(",   {beforeExpr: true, startsExpr: true}),
  interrobang:  punctuator("?!",   {beforeExpr: true, startsExpr: true}),

  // also includes =>>, ->, ->>, +>, +>>, +=>, +=>>
  arrow:        punctuator("=>", {beforeExpr: true, startsExpr: true}),
  ellipsis:     punctuator("...", beforeExpr),

  template:     new TokenType("template", "Template"),
  backQuote:    punctuator("`",   startsExpr),
  dollarBraceL: punctuator("${", {beforeExpr: true, startsExpr: true, continuesExpr: true}),
  at:           punctuator("@"),
  excl:         punctuator("!",  {beforeExpr: true, startsExpr: true, startsArguments: true}),

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

  eq:         punctuator("=", {beforeExpr: true, continuesExpr: true, isAssign: true}),
  assign:     punctuator("_=", {beforeExpr: true, continuesExpr: true, isAssign: true}),
  incDec:     punctuator("++/--", {prefix: true, postfix: true, startsExpr: true}),
  bitwiseNOT: punctuator("~", {beforeExpr: true, continuesExpr: true, prefix: true, startsExpr: true, babylonName: "prefix"}),
  _not:               kw("not", {beforeExpr: true, continuesExpr: true, prefix: true, startsExpr: true, babylonName: "prefix", estreeValue: "!"}),
  _or:                kw("or", {binop: 1, beforeExpr: true, continuesExpr: true, binopExpressionName: "LogicalExpression", babylonName: "logicalOR", estreeValue: "||"}),
  _and:               kw("and", {binop: 2, beforeExpr: true, continuesExpr: true, binopExpressionName: "LogicalExpression", babylonName: "logicalAND", estreeValue: "&&"}),
  bitwiseOR:       binop("|", 3),
  bitwiseXOR:      binop("^", 4),
  bitwiseAND:      binop("&", 5),
  // Either form of equality (is/isnt/like/unlike or ===/!==/==/!=) are parsable,
  // but one or the other is always generated. is/isnt/like/unlike is the default.
  // TODO: throw an error when mixing types.
  _is:                kw("is", {binop: 6, beforeExpr: true, continuesExpr: true, babylonName: "equality", estreeValue: "==="}),
  _isnt:              kw("isnt", {binop: 6, beforeExpr: true, continuesExpr: true, babylonName: "equality", estreeValue: "!=="}),
  _like:              kw("like", {binop: 6, beforeExpr: true, continuesExpr: true, babylonName: "equality", estreeValue: "=="}),
  _unlike:            kw("unlike", {binop: 6, beforeExpr: true, continuesExpr: true, babylonName: "equality", estreeValue: "!="}),
  equality:        binop("==", 6),
  relational:      binop("</>", 7),
  _in:                kw("in", {binop: 7, beforeExpr: true, continuesExpr: true}),
  _instanceof:        kw("instanceof", {binop: 7, beforeExpr: true, continuesExpr: true}),
  bitShift:        binop("<</>>", 8),
  plusMin:    punctuator("+/-", {binop: 9, beforeExpr: true, continuesExpr: true, prefix: true, startsExpr: true}),
  modulo:          binop("%", 10),
  positiveModulo:  binop("%%", 10), // See lydell/frappe '"useful" modulo'
  star:            binop("*", 10),
  slash:           binop("/", 10),
  exponent:   punctuator("**", {binop: 11, beforeExpr: true, continuesExpr: true, rightAssociative: true}),
};

kw = function kw(name, options = {}, alias = "Keyword") {
  options.keyword = name;
  options.code = name;
  let type = new TokenType(name, alias, options);
  types["_" + name] = keywords[name] = type;
}

kw("typeof", {beforeExpr: true, continuesExpr: true, prefix: true, startsExpr: true});
kw("void", {beforeExpr: true, continuesExpr: true, prefix: true, startsExpr: true});
kw("delete", {beforeExpr: true, continuesExpr: true, prefix: true, startsExpr: true});
// declarations
kw("var", startsStmt);
kw("let", startsStmt);
kw("const", startsStmt);
kw("extern", startsStmt);
kw("function", startsStmt); // startsExpr // in tacoscript, function is only used as a declaration
// control flow
kw("then", {beforeExpr: true, continuesExpr: true, startsExpr: true});
kw("if", {beforeExpr: true, continuesExpr: true, startsExpr: true});
kw("else", {beforeExpr: true, startsExpr: true});
kw("switch", {beforeExpr: true, continuesExpr: true, startsExpr: true});
kw("case", beforeExpr);
kw("default", beforeExpr);
// iteration
kw("for", loopHeader);
kw("update", {beforeExpr: true, continuesExpr: true, startsExpr: true});
kw("upto", {beforeExpr: true, continuesExpr: true, startsExpr: true});
kw("downto", {beforeExpr: true, continuesExpr: true, startsExpr: true});
kw("while", loopHeader);
kw("do", loopHeader);
kw("continue", startsStmt);
kw("break", startsStmt);
kw("return", {beforeExpr: true, startsStmt: true});
kw("of", beforeExpr); // TODO: add binop via plugin for `contains`
// exceptions
kw("throw", {beforeExpr: true, startsStmt: true});
kw("try", startsStmt);
kw("catch");
kw("finally");
// blocks
kw("with", {beforeExpr: true, continuesExpr: true, startsStmt: true});
// expression modifiers
kw("new", {beforeExpr: true, continuesExpr: true, startsExpr: true});
kw("yield", {beforeExpr: true, startsExpr: true});
kw("await", {beforeExpr: true, startsExpr: true});
// classes
kw("static", {continuesExpr: true});
kw("class", startsStmt);
kw("extends", beforeExpr);
kw("private");
kw("protected");
kw("public");
kw("get", {continuesExpr: true});
kw("set", {continuesExpr: true});
// modules
kw("export", {continuesExpr: true});
kw("import", {continuesExpr: true});
kw("from", {continuesExpr: true});
kw("as", {continuesExpr: true}); // NOTE: not included in es2016 keywords
// special types
kw("null", startsExpr, "NullLiteral");
kw("true", startsExpr, "BooleanLiteral");
kw("false", startsExpr, "BooleanLiteral");
kw("this", startsExpr);
kw("super", startsExpr);

kw("debugger", startsStmt);
kw("pass", startsStmt);
