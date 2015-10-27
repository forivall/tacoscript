
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

// instance.extend("next", function(inner) {
//   return function next() {
//     if (!this.isLookahead) {
//       this.cstState.nodeStack[0]._tokenElements.push({value: new Token(this.state), type: "token"});
//     }
//     let value = inner.apply(this, arguments);
//     return value;
//   };
// });
//
// instance.extend("startNodeAt", function(inner) {
//   return function startNodeAt(pos) {
//     if (this.state.start < pos) throw new Error(`Node started later than possible: ${this.state.start} < ${pos}`);
//     let node = inner.apply(this, arguments);
//     node._tokenElements = this.startNodeTokens();
//     parentNodeLoop: for (let parentNode of (this.cstState.nodeStack: Array)) {
//       while (parentNode._tokenElements.length > 0) {
//         if (peek(parentNode._tokenElements).value.start >= pos) break parentNodeLoop;
//         node._tokenElements.push(parentNode._tokenElements.pop());
//       }
//     }
//     this.cstState.nodeStack.unshift(node);
//     return node;
//   };
// });
//
// instance.extend("startNode", function(inner) {
//   return function startNode() {
//     let node = inner.apply(this, arguments);
//     this.cstState.nodeStack.unshift(node);
//     node._tokenElements = this.startNodeTokens();
//     return node;
//   };
// });
//
// instance.extend("finishNode", function(inner) {
//   return function finishNode() {
//     let node = inner.apply(this, arguments);
//     this.finishNodeTokens(node);
//     return node;
//   };
// });
//
// instance.extend("finishNodeAt", function(inner) {
//   return function finishNodeAt(node_, type, pos) {
//     if (this.state.lastTokEnd < pos) throw new Error(`Node ended sooner than possible: ${this.state.lastTokeEnd} < ${pos}`);
//     let node = inner.apply(this, arguments);
//
//     while (node._tokenElements.length > 0) {
//       if (peek(node._tokenElements).value.end >= pos) break;
//       this.cstState.orphanTokens.push(node._tokenElements.pop());
//     }
//     this.finishNodeTokens(node);
//     return node;
//   };
// });
//
//
// pp.startNodeTokens = function() {
//   let tokens = this.cstState.orphanTokens;
//   this.cstState.orphanTokens = [];
//   return tokens;
// }
//
// function nodeContains(node, child) {
//   if (node == null) return false;
//   for (let key of (VISITOR_KEYS[node.type]: Array)) {
//     let containPath;
//     if (isArray(node[key])) {
//       for (let arr = node[key], len = arr.length, childNode, i = 0; childNode = arr[i], i < len; i++) {
//         if (childNode === child) return key + "." + i;
//         else if (containPath = nodeContains(childNode, child)) {
//           return key + "." + i + "." + containPath;
//         }
//       }
//     } else if (node[key] === child) {
//       return key;
//     } else if (containPath = nodeContains(node[key], child)) {
//       return key + "." + containPath;
//     }
//   }
//   return false;
// }
//
// pp.finishNodeTokens = function(node) {
//   this.cstState.nodeStack.shift();
//   let parentNode = this.cstState.nodeStack[0];
//   if (parentNode != null && parentNode !== node) parentNode._tokenElements.push({value: node, type: "node"});
//
//   // convert _tokenElements to tokenElements
//   var tokenElements = node.tokenElements = [];
//   let visited = {};
//   let orphanNodes = [];
//   for (let element of (node._tokenElements: Array)) {
//     cond: switch (element.type) {
//       case "token":
//         tokenElements.push({
//           token: {
//             ...element.value,
//             type: tokenToName.get(element.value.type),
//           },
//           kind: "whitespace"
//         });
//         break;
//       case "node":
//         let childNode = element.value;
//         for (let key of (VISITOR_KEYS[node.type]: Array)) {
//           if (isArray(node[key])) {
//             let nextIndex = visited[key] || (visited[key] = 0);
//             if (node[key][nextIndex] === childNode) {
//               tokenElements.push({child: key, list: "next"})
//               visited[key]++;
//               break cond;
//             } else if (includes(node[key], childNode)) {
//               throw new Error("tokenElements list item out of order");
//             }
//           } else if (node[key] === childNode) {
//             visited[key] = true;
//             tokenElements.push({child: key})
//             break cond;
//           }
//         }
//         // if this node contains an orphan node, move all current token elements into that child
//         // also search children nodes, and reparent tokenElements
//         // orphanNodes.push(element.value);
//         // if this node is in an already seen node, then put all remaining tokenElements into that node
//         // else put it in orphans
//         let childPath = nodeContains(node, childNode);
//         if (childPath) {
//           tokenElements.push({child: childPath});
//           break cond;
//         }
//         console.dir(node);
//         console.dir(childNode);
//         throw new Error("node not found in children");
//       default:
//         throw new Error("Unknown tokenElement type");
//     }
//   }
//   if (orphanNodes.length) {
//     throw new Error("unadopted orphans!");
//   }
// };
