/**
 * Postprocessor that attaches CST nodes to the AST
 *
 */

import {SourceLocation} from "../util/location";

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

  dereference(parent, childReference, state) {
    if (childReference === undefined) return undefined;
    let [key, list] = childReference.reference.split('#');
    let node;
    if (list === "next") {
      node = parent[key][state.list[key] || 0];
      state.list[key] = (state.list[key] || 0) + 1;
    } else {
      node = parent[key];
    }
    return node;
  }

  // TODO: convert to use a traverse helper, similar to babel's traversal helpers
  traverse(node) {
    let state = {list: {}};
    let children = node._childReferences || [];
    let i = 0;
    let nextChild = children[i];
    let nextNode = this.dereference(node, nextChild, state);

    // TODO: simplify control flow
    while (this.index < this.tokens.length) {
      let token = this.tokens[this.index];
      while (
          token != null &&
          (!nextChild || nextChild.element == null || token.index < nextChild.extra.tokenIndex) &&
          (!nextNode || token.index < nextNode.tokenStart) &&
          token.end <= node.end &&
          token.index <= node.tokenEnd &&
      true) {
        let tokenJson = {
          element: token.type.alias,
          value: (token.end - token.start > 0) ? token.type.toCode(token, this.ast) : "",
          start: token.start,
          end: token.end,
          loc: new SourceLocation(this.ast, token.startLoc, token.endLoc),
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
            // sourceElement is for a token, skip the token.
            this.index++;
          }
        }
        nextChild = children[i += 1];
        nextNode = this.dereference(node, nextChild, state);
      } else {
        break;
      }
    }
    if (nextChild || i < children.length) {
      throw new Error("all children not consumed");
    }
  }
}
