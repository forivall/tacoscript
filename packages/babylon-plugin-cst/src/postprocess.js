
import sortBy from "lodash/collection/sortBy";
import isArray from "lodash/lang/isArray";
import { VISITOR_KEYS } from "babel-types";
import { tokenToName } from "./types";

export default function(ast) { new Postprocessor().process(ast); return ast; }

export class Postprocessor {
  process(ast) {
    this.ast = ast;
    this.tokens = ast.tokens;
    this.stack = [];
    this.index = 0;
    this.traverse(ast);
    if (this.index < this.tokens.length) {
      throw new Error("All tokens not consumed");
    }
  }
  childrenList(node) {
    let children = [];
    let visitorKeys: Array = VISITOR_KEYS[node.type];
    if (visitorKeys == null) return [];
    for (let key of visitorKeys) {
      if (isArray(node[key])) {
        let prevEnd = 0;
        for (let arr = node[key], len = arr.length, i = 0, childNode; childNode = arr[i], i < len; i++) {
          if (childNode) {
            children.push({child: key, node: childNode, list: "next", start: childNode.start, end: childNode.end, index: i});
            prevEnd = childNode.end;
          } else {
            children.push({child: key, list: "skip", start: prevEnd, end: prevEnd, index: i})
          }
        }
      } else if (node[key] != null){
        children.push({child: key, node: node[key], start: node[key].start, end: node[key].end});
      }
    }
    return sortBy(children, (child) => child.start);
  }

  traverse(node) {
    let children = this.childrenList(node);
    node.tokenElements = [];
    let nextChild = children.shift();
    while (nextChild && nextChild.list === "skip") {
      node.tokenElements.push({child: nextChild.key, list: "skip", listIndex: nextChild.index});
      nextChild = children.shift();
    }
    while (
        this.index < this.tokens.length &&
        (this.tokens[this.index].end <= node.end ||
        children.length && this.tokens[this.index].end <= children[children.length - 1].end ||
        nextChild)) {
      if (nextChild && nextChild.node && this.tokens[this.index].start >= nextChild.node.start) {
        this.traverse(nextChild.node);
        let tokenElement = {child: nextChild.child}
        if (nextChild.list) {
          tokenElement.list = nextChild.list;
          tokenElement.listIndex = nextChild.index;
        }
        node.tokenElements.push(tokenElement);
        nextChild = children.shift();
        // TODO: place skip nodes more appropriately
        while (nextChild && nextChild.list === "skip") {
          node.tokenElements.push({child: nextChild.key, list: "skip", listIndex: nextChild.index});
          nextChild = children.shift();
        }
      } else {
        let token = this.tokens[this.index];
        let tokenElement = {
          token: {
            ...token,
            type: tokenToName.get(token.type),
          },
          kind: token.type.whitespace ? "whitespace" : "code"
        };
        node.tokenElements.push(tokenElement);
        this.index++;
      }
    }
    if (nextChild || children.length) {
      throw new Error("all children not consumed");
    }
  }
}
