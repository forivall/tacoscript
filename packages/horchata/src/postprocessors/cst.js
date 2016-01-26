/**
 * Postprocessor that attaches CST nodes to the AST
 *
 */

import {SourceLocation} from "../util/location";
import {dereference, startOf, tokenStartOf} from "tacoscript-cst-utils";

export default function(ast, tokens) { new Postprocessor().process(ast, tokens); return ast; }

export class Postprocessor {
  process(ast, tokens) {
    this.ast = ast;
    this.tokens = tokens;
    this.index = 0;
    this.traverse(ast);
    if (this.index < this.tokens.length) {
      throw new Error("All tokens not consumed");
    }
  }

  nextSourceTokenIndex(el, node) {
    if (el.extra && el.extra.tokenIndex != null) return el.extra.tokenIndex;
    if (node) return tokenStartOf(node);
    throw new Error("Cannot get index of el " + JSON.stringify(el));
  }

  // TODO: convert to use a traverse helper, similar to babel's traversal helpers
  traverse(node) {
    let state = {list: {}};
    let children = node._childReferences || [];
    let i = 0;
    let nextChild = children[i];
    let nextNode = dereference(node, nextChild, state);

    // TODO: simplify control flow
    while (this.index < this.tokens.length) {
      let token = this.tokens[this.index];
      while (
          token != null && (
            !nextChild ||
            nextChild.element == null ||
            (token.index !== -1 ? token.index < this.nextSourceTokenIndex(nextChild, nextNode) : token.start < (nextChild.start || startOf(nextNode))) ||
          false) &&
          (!nextNode || !nextNode.__isNode || token.index < tokenStartOf(nextNode)) &&
          token.end <= node.end &&
          token.index <= node.tokenEnd &&
      true) {
        let tokenJson = {
          element: token.type.alias,
          value: (token.end - token.start > 0) ? token.type.toCode(token, this.ast) : "",
          start: token.start,
          end: token.end,
          loc: token.loc.clone(),
          extra: {tokenValue: token.value, tokenType: token.type.key},
        };
        if (token.index >= 0) tokenJson.extra.tokenIndex = token.index;
        node.sourceElements.push(tokenJson);

        this.index++;
        token = this.tokens[this.index];
      }
      if (nextChild) {
        node.sourceElements.push(nextChild);
        if (!nextChild.element && nextNode != null) {
          this.traverse(nextNode);
        } else {
          if (token && token.index != null && token.index === nextChild.extra.tokenIndex) {
            // sourceElement is for a token, skip the token, since it's already been included while parsing
            this.index++;
          }
        }
        i += 1;
        nextChild = children[i];
        nextNode = dereference(node, nextChild, state);
      } else {
        break;
      }
    }
    if (nextChild || i < children.length) {
      throw new Error("all children not consumed");
    }
  }
}
