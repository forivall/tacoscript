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
export function parseExpression(expressionContext = {}) {
  return this.parseExpressionMaybeSequence(expressionContext);
}

// precedence: 0
export function parseExpressionMaybeSequence(expressionContext) {
  let startPos = this.state.cur.start;
  let startLoc = this.state.cur.startLoc;
  let expr = this.parseExpressionMaybeKeywordOrAssignment(expressionContext);
  if (this.match(tt.semi)) {
    let node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(tt.semi)) {
      node.expressions.push(this.parseExpressionMaybeKeywordOrAssignment(expressionContext));
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
export function parseExpressionMaybeKeywordOrAssignment(expressionContext, callbacks) {
  let node;
  switch (this.state.type) {
    case tt._yield: node = this.parseYieldExpression(); break;
    case tt._if: node = this.parseConditionalExpression(); break;
    default:
      let maybeOtherExpressionNode = this.parseOtherKeywordExpression(node);
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
        this.state.potentialLambdaAt = this.state.start;
      }

      // tacoscript conditional expressions always start with `if` or `if!`,
      // so we don't need a parseMaybeConditional
      node = this.parseExpressionOperators(expressionContext);
      if (callbacks.afterLeftParse) {
        node = callbacks.afterLeftParse.call(this, node, start);
      }

      if (this.state.cur.type.isAssign) {
        let left = node;
        node = this.startNode(start);
        node.operator = this.state.value;
        left = node.left = this.toAssignable(left, this.state.cur.type);
        expressionContext.shorthandDefaultPos.start = 0;  // reset because shorthand default was used correctly

        this.checkAssignable(left);
        this.next();

        node.right = this.parseExpressionMaybeKeywordOrAssignment(expressionContext);
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

// TODO: make sure to unset "noIn" when it becomes irrelevent

// Start the precedence parser
export function parseExpressionOperators(expressionContext) {
  let start = {...this.state.cur};
  let node = this.parseExpressionMaybeUnary(expressionContext);
  if (expressionContext.shorthandDefaultPos && expressionContext.shorthandDefaultPos.start) {
    return node;
  }
  return this.parseExpressionOperator(node, start, -1, {noIn: expressionContext.noIn});
}

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

export function parseExpressionOperator(node, start, minPrec, expressionContext) {
  // TODO:
  throw new Error("Not Implemented");
}

// Parse unary operators, both prefix and postfix.
export function parseExpressionMaybeUnary(expressionContext) {
  expressionContext = {...expressionContext, noIn: false}; // `in` is allowed in unary operators
  if (this.state.cur.type.prefix) {
    throw new Error("Not Implemented");
  }
  let start = {...this.state.cur};
  let node = this.parseExpressionSubscripts(expressionContext);
}

// Parse call, dot, and `[]`-subscript expressions.
export function parseExpressionSubscripts(expressionContext) {
  let start = {...this.state.cur};
  let potentialLambdaOn = this.state.potentialLambdaOn;
  let node = this.parseExpressionAtomic(expressionContext);

  throw new Error("Not Implemented");

  // check if we just parsed an arrow-type function expression
  let skipArrowSubscripts = false;

  if (skipArrowSubscripts || expressionContext.shorthandDefaultPos && expressionContext.shorthandDefaultPos.start) {
    return node;
  }

  return this.parseSubscripts(node, start);
}

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
      // TODO
    default:
      this.unexpected();
  }
  return node;
}
