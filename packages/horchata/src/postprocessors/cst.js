/**
 * Postprocessor that attaches CST nodes to the AST
 *
 */

import {dereference, startOf, tokenStartOf} from "tacoscript-cst-utils";

export default function(ast, tokens, options) { new Postprocessor(options).process(ast, tokens); return ast; }

export class Postprocessor {
  constructor(options = {}) {
    this.sourceElementsKey = options.sourceElementsKey || 'sourceElements';
  }

  process(ast, tokens) {
    this.ast = ast;
    this.tokens = tokens;
    this.index = 0;
    this.traverse(ast, null);
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
  traverse(node, parentNode) {
    let state = {list: {}};
    let children = node._childReferences || [];
    let i = 0;
    let nextChild = children[i];
    let nextNode = dereference(node, nextChild, state);

    const sourceElements = node[this.sourceElementsKey];

    // TODO: simplify control flow
    while (this.index < this.tokens.length) {
      let token = this.tokens[this.index];
      while (
        // check that the token is within the current node that we're
        // traversing upon
          token != null && (
            !nextChild ||
            nextChild.element == null ||
            (token.index !== -1 ?
              token.index < this.nextSourceTokenIndex(nextChild, nextNode) :
              token.start < (nextChild.start || startOf(nextNode))) ||
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

        // Associate leading whitespace on `pass` to it, because they translate
        // to punctuation, so we want to omit it when translating
        if (tokenJson.element === 'Keyword' && tokenJson.value === 'pass') {
          const parentSourceElements = parentNode[this.sourceElementsKey];
          if (parentSourceElements) {
            const lastParentSourceElement = parentSourceElements[parentSourceElements.length - 1];
            if (lastParentSourceElement && lastParentSourceElement.element === 'WhiteSpace') {
              sourceElements.push(parentSourceElements.pop())
            }
          }
        }

        sourceElements.push(tokenJson);

        this.index++;
        token = this.tokens[this.index];
      }
      // done checking and pushing all of the tokens, now we move onto the next
      // child node's reference
      if (nextChild) {
        if (!nextChild.element && nextNode != null) {
          this.traverse(nextNode, node);
        } else {
          if (token && token.index != null && token.index === nextChild.extra.tokenIndex) {
            // sourceElement is for a token, skip the token, since it's already been included while parsing
            this.index++;
          }
        }
        i += 1;
        sourceElements.push(nextChild);
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
