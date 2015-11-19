/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

// A recursive descent parser operates by defining functions for all
// syntactic elements, and recursively calling those, each function
// advancing the input stream and returning an AST node. Precedence
// of constructs (for example, the fact that `!x[1]` means `!(x[1])`
// instead of `(!x)[1]` is handled by the fact that the parser
// function that parses unary prefix operators is called first, and
// in turn calls the function that parses `[]` subscripts — that
// way, it'll receive the node for `x[1]` already parsed, and wraps
// *that* in the unary operator node.
//
// Horchata uses an [operator precedence parser][opp] (inherited from
// Acorn) to handle binary
// operator precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// However, the non-left-to-right associative operators use recursive descent.
//
// See also: [the MDN Operator Precedence page][MDNOP]
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser
// [MDNOP]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence

import {types as tt} from "../../tokenizer/types";

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.



// Parse a full expression. The expressionContext is used to:
// * forbid the `in` operator (in for loops initalization expressions)
// * provide reference for storing '=' operator inside shorthand
//   property assignment in contexts where both object expression
//   and object pattern might appear (so it's possible to raise
//   delayed syntax error at correct position).

// main entry point into expression parsing. Can be used by plugins
// since `;` is used for the sequence operator and `,` is only used for lists,
// this should be used wherever `parseMaybeAssign` would be in acorn or babylon.
export function parseExpression(expressionContext = {}, callbacks = {}) {
  return this.parseExpressionMaybeSequence(expressionContext, callbacks);
}

// precedence: 0
export function parseExpressionMaybeSequence(expressionContext, callbacks) {
  let startPos = this.state.cur.start;
  let startLoc = this.state.cur.startLoc;
  let expr = this.parseExpressionMaybeKeywordOrAssignment(expressionContext, callbacks);
  if (this.match(tt.semi)) {
    let node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(tt.semi)) {
      node.expressions.push(this.parseExpressionMaybeKeywordOrAssignment(expressionContext, callbacks));
    }
    this.checkReferencedList(node.expressions);
    return this.finishNode(node, "SequenceExpression");
  }
  return expr;
}

// Parse an expression, with the highest level being an AssignmentExpression
// This includes applications of // operators like `+=`.

// Also, because of the leading if on conditional expressions, they have
// a higher precedence than assignment expressions

// precedence: 2, 3, 4
// equivalent to parseMaybeAssign.
export function parseExpressionMaybeKeywordOrAssignment(expressionContext, callbacks = {}) {
  let node;
  switch (this.state.cur.type) {
    case tt._yield: node = this.parseYieldExpression(); break;
    case tt._if:
      this.next();
      node = this.parseConditionalExpression();
      break;
    default:
      let maybeOtherExpressionNode = this.parseOtherKeywordExpression();
      if (maybeOtherExpressionNode) {
        node = maybeOtherExpressionNode;
        break;
      }

      let failOnShorthandAssign = expressionContext.shorthandDefaultPos == null;
      if (failOnShorthandAssign) {
        expressionContext.shorthandDefaultPos = {start: 0};
      }

      let start = {...this.state.cur};

      // tacoscript arrow functions _always_ have arguments surrounded by parens
      // TODO: add plugin extension point here for custom function syntax, to
      // accomodate [frappe lambdas][fl], etc from within a plugin
      // fl: https://github.com/lydell/frappe#consistently-short-arrow-function-syntax
      if (this.match(tt.parenL)) {
        this.state.potentialLambdaOn = {...this.state.cur};
      }

      // tacoscript conditional expressions always start with `if` or `if!`,
      // so we don't need a parseMaybeConditional
      node = this.parseExpressionOperators(expressionContext);
      if (callbacks.afterLeftParse) {
        node = callbacks.afterLeftParse.call(this, node, start);
      }

      if (this.state.cur.type.isAssign) {
        let left = node;
        let type = this.state.cur.type;
        node = this.startNode(start);
        node.operator = this.state.cur.value;
        left = node.left = this.convertLeftAssign(left, type);
        expressionContext.shorthandDefaultPos.start = 0;  // reset because shorthand default was used correctly

        this.checkAssignable(left);
        this.next();

        let right = this.parseExpressionMaybeKeywordOrAssignment(expressionContext);
        node.right = this.convertRightAssign(right, type);
        node = this.finishNode(node, "AssignmentExpression");
        break;
      }

      // TODO: add plugin hook here
  }
  return node;
}

export function parseOtherKeywordExpression() {
  // Purposefully left empty for plugins. See docs/horchata-plugins.md#empty-functions
  return null;
}

// TODO: make sure to unset "isFor" when it becomes irrelevent
// isFor is equivalent to "noIn", since we could introduce more `for` iteration keywords
// that could also be used as operators.

// Start the precedence parser
export function parseExpressionOperators(expressionContext) {
  let start = {...this.state.cur};
  let node = this.parseExpressionMaybeUnary(expressionContext);
  if (expressionContext.shorthandDefaultPos && expressionContext.shorthandDefaultPos.start) {
    return node;
  }
  return this.parseExpressionOperator(node, start, -1, {isFor: expressionContext.isFor});
}

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

export function parseExpressionOperator(node, start, minPrec, expressionContext) {
  let prec = this.state.cur.type.binop;
  if (prec != null && !(expressionContext.isFor && this.match(tt._in)) &&
      prec > minPrec) {
    let left = node;
    node = this.startNode(start);
    node.left = left;
    node.operator = this.state.cur.type.estreeValue || this.state.cur.value;
    this.checkExpressionOperatorLeft(node);

    let op = this.state.cur.type;
    this.next();

    node.right = this.parseExpressionOperator(this.parseExpressionMaybeUnary(),
      {...this.state.cur}, op.rightAssociative ? prec - 1 : prec, expressionContext
    );
    node = this.finishNode(node, op.binopExpressionName);
    node = this.parseExpressionOperator(node, start, minPrec, expressionContext);
  }
  return node;
}

// Parse unary operators, both prefix and postfix.
export function parseExpressionMaybeUnary(expressionContext = {}) {
  expressionContext = {...expressionContext, isFor: false}; // `in` is allowed in unary operators
  if (this.state.cur.type.prefix) {
    throw new Error("Not Implemented");
  }
  let start = {...this.state.cur};
  let node = this.parseExpressionSubscripts(expressionContext);
  if (expressionContext.shorthandDefaultPos && expressionContext.shorthandDefaultPos.start) {
    return node;
  }
  while (this.state.cur.type.postfix) {
    let expr = node;
    node = this.startNode(start);
    node.operator = this.state.value;
    node.prefix = false;
    node.argument = expr;
    this.checkAssignable(expr);
    this.next();
    node = this.finishNode(node, "UpdateExpression");
  }
  return node;
}

export function isArrowFunctionExpression(node) {
  // TODO: investigate what the parsing rules are around subscript parsing, and see if we need this,
  // or if it's just a performance optimization
  return node.type === "ArrowFunctionExpression";
}

// Parse call, dot, and `[]`-subscript expressions.
export function parseExpressionSubscripts(expressionContext) {
  let start = {...this.state.cur};
  let potentialLambdaOn = this.state.potentialLambdaOn;
  let node = this.parseExpressionAtomic(expressionContext);

  // check if we just parsed an arrow-type function expression
  let skipArrowSubscripts = this.isArrowFunctionExpression(node) && start.start === potentialLambdaOn.start;

  if (skipArrowSubscripts || expressionContext.shorthandDefaultPos && expressionContext.shorthandDefaultPos.start) {
    return node;
  }

  return this.parseSubscripts(node, start);
}

// NOTE: parseExprList has the signature (close, allowTrailingComma, allowEmpty, refDestructuringErrors)

export function parseSubscripts(base, start, subscriptContext = {}) {
  let noCalls = subscriptContext.isNew;
  let node = base;
  for (;;) {
    if (!noCalls && this.eat(tt.doubleColon)) {
      node = this.startNode(start);
      node.object = base;
      node.callee = this.parseNonCallExpression();
      node = this.parseSubscripts(this.finishNode(node, "BindExpression"), start, subscriptContext);
      break;
    } else if (this.eat(tt.dot)) {
      node = this.startNode(start);
      node.object = base;
      node.property = this.parseIdentifier({allowKeywords: true});
      node.computed = false;
      base = node = this.finishNode(node, "MemberExpression");
    } else if (this.eat(tt.bracketL)) {
      node = this.startNode(start);
      node.object = base;
      node.property = this.parseExpression();
      node.computed = true;
      this.eat(tt.bracketR) || this.unexpected();
      base = node = this.finishNode(node, "MemberExpression");
    } else if (!noCalls && this.eat(tt.parenL)) {
      node = this.startNode(start);
      node.callee = base;
      node.arguments = this.parseCallExpressionArguments(tt.parenR);
      base = node = this.finishNode(node, "CallExpression");
      this.checkReferencedList(node.arguments);
    } else if (!noCalls && this.eat(tt.excl)) {
      node = this.startNode(start);
      node.callee = base;
      // TODO: create a specific method for this: if an indent is found, then the ending is a dedent.
      // otherwise it stays a newline.
      node.arguments = this.parseCallExpressionArguments(tt.newline, {exclCall: true});
      base = node = this.finishNode(node, "CallExpression");
      this.checkReferencedList(node.arguments);
    } else if (this.match(tt.backQuote)) {
      node = this.startNode(start);
      node.tag = base;
      node.quasi = this.parseTemplate();
      base = node = this.finishNode(node, "TaggedTemplateExpression");
    } else {
      break;
    }
  }
  return node;
}

// TODO: allow expr (!) auto closing call expressions.
export function parseCallExpressionArguments(close, expressionContext = {}) {
  const {allowTrailingComma} = expressionContext;
  let elements = [];
  let indented = false;
  let first = true;

  while (!this.match(indented ? tt.dedent : close)) {
    if (!indented) {
      indented = this.eat(tt.indent);
      if (indented && first) first = false;
    }
    if (first) {
      first = false;
    } else {
      this.eat(tt.comma) || indented && this.eat(tt.newline) || this.unexpected();
    }

    if (allowTrailingComma && this.eat(indented ? tt.dedent : close)) {
      break;
    }
    let node;
    if (this.match(tt.ellipsis)) {
      node = this.parseSpread(expressionContext);
    } else {
      node = this.parseExpression(expressionContext);
    }
    elements.push(node);
  }
  if (indented) {
    if (close !== tt.newline) this.eat(tt.newline) || this.unexpected();
    this.eat(tt.dedent) || this.unexpected();
  }
  this.eat(close) || this.unexpected();
  return elements;
}

export function parseSpread(expressionContext) {
  let node = this.startNode();
  this.next();
  node.argument = this.parseExpressionMaybeKeywordOrAssignment(expressionContext);
  return this.finishNode(node, "SpreadElement");
}

// TODO: move the below function to literals

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.

export function parseExpressionAtomic(expressionContext) {
  let node;
  let canBeArrow = this.state.potentialLambdaOn.start === this.state.cur.start;
  switch (this.state.cur.type) {
    case tt._super:
      this.checkSuperStatement();
      throw new Error("Not Implemented");
    case tt._this:
      // TODO: move to a parse function
      node = this.startNode();
      this.next();
      node = this.finishNode(node, "ThisExpression");
      break;

    case tt.name:
      node = this.parseIdentifier();
      // NOTE: tacoscript arrow expressions _must_ have parens, so don't worry about
      // arrows here.
      break;

    case tt.regexp:
      let value = this.state.cur.value;
      node = this.parseLiteral(value.value, "RegExpLiteral");
      node.pattern = value.pattern;
      node.flags = value.flags;
      break;

    // TODO: store cst info.
    case tt.num:
      node = this.parseLiteral(this.state.cur.value, "NumericLiteral");
      break;

    case tt.string:
      node = this.parseLiteral(this.state.cur.value, "StringLiteral");
      break;

    case tt._null:
      node = this.startNode();
      this.next();
      node = this.finishNode(node, "NullLiteral");
      break;

    case tt._true: case tt._false:
      node = this.startNode();
      node.value = this.match(tt._true);
      this.next();
      node = this.finishNode(node, "BooleanLiteral");
      break;

    case tt.parenL:
      node = this.parseParenAndDistinguishExpression(null, {...expressionContext, canBeArrow});
      break;

    case tt.bracketL:
      node = this.parseArrayExpression(expressionContext);
      break;

    case tt.braceL:
      throw new Error("Not Implemented");

    case tt._function:
      throw new Error("Not Implemented");

    case tt._class:
      throw new Error("Not Implemented");

    case tt._new:
      throw new Error("Not Implemented");

    case tt.backquote:
      throw new Error("Not Implemented");

    // TODO:
    // case tt._do:

    default:
      this.unexpected();
  }
  return node;
}

// Parse an expression grouped by parenthises -- could be
// * an expression
// * a comprehension
// * arguments for an anonymous function
// * anything else that a plugin might want to add (ex. flow type annotations)
// Our job is to distinguish which of these things it is, and
export function parseParenAndDistinguishExpression(start, expressionContext = {}) {
  const {canBeArrow, allowTrailingComma} = expressionContext;
  if (start == null) start = {...this.state.cur};

  this.next();

  let innerStart = {...this.state.cur};

  // TODO: add hook to parse comprehensions here

  let elements = [];
  let indented = false;
  let first = true;

  expressionContext.shorthandDefaultPos = {start: 0};
  let node, spreadStart, firstSeparatorStart;
  while (!this.match(indented ? tt.dedent : tt.parenR)) {
    if (!indented) {
      indented = this.eat(tt.indent);
      if (indented && first) first = false;
    }
    if (first) {
      first = false;
    } else {
      firstSeparatorStart = this.state.cur.start;
      this.eat(tt.comma) || indented && this.eat(tt.newline) || this.unexpected();
    }

    if (allowTrailingComma && this.eat(indented ? tt.dedent : tt.parenR)) {
      break;
    }
    let node;
    if (this.match(tt.ellipsis)) {
      spreadStart = this.state.cur.start;
      node = this.parseRest();
      elements.push(node);
      break;
    } else {
      node = this.parseExpression(expressionContext); // , {afterLeftParse: this.parseParenItem}
    }
    elements.push(node);
  }
  if (indented) {
    this.eat(tt.dedent) && this.eat(tt.newline) || this.unexpected();
  }
  this.eat(tt.parenR) || this.unexpected();

  let {type, value} = this.state.cur;

  if (canBeArrow && (
      this.eat(tt.arrow) ||
      this.eat(tt.unboundArrow) ||
      this.eat(tt.asyncArrow) ||
      this.eat(tt.asyncBoundArrow) ||
      false)) {
    elements = this.toArguments(elements);
    node = this.parseArrowExpression(type, value, start, elements, expressionContext);
  } else if (elements.length === 0) {
    this.unexpected(this.state.prev.start);
  } else if (spreadStart) {
    this.unexpected(spreadStart);
  } else if (expressionContext.shorthandDefaultPos.start) {
    this.unexpected(expressionContext.shorthandDefaultPos.start);
  } else if (firstSeparatorStart) {
    this.unexpected(firstSeparatorStart);
  } else if (elements.length > 1) {
    this.raise(this.state.pos, "Arguments list is not attached to a function");
  } else {
    node = elements[0];
    node.parenthesizedExpression = true;
  }

  return node;
}

// expects the `if` to already be on `cur`, and the `!` to maybe be next.
export function parseConditionalExpression(expressionContext = {}) {
  let node = this.startNode();
  this.eat(tt.excl);
  node.test = this.parseExpression();

  this.eat(tt._then) || this.unexpected();
  node.consequent = this.parseExpression();

  this.eat(tt._else) || this.unexpected();
  node.alternate = this.parseExpression();

  return this.finishNode(node, "ConditionalExpression");
}
