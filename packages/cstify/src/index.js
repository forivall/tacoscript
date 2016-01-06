
import {VISITOR_KEYS} from 'babel-types';
import heap from 'heapjs';
import TYPE_TO_ELEMENT from './type-to-element';
import {dereference} from 'tacoscript-cst-utils';

export default function cstify(ast, source) {
  return new Processor().process(ast, source);
}

export class Processor {
  process(ast, source) {
    this.ast = ast;
    this.source = source;
    this.index = 0;
    this.tokens = ast.tokens;
    this.tokensLength = this.tokens.length;

    this.traverse(ast);

    return this.ast;
  }

  traverse(node) {
    if (!node) return;

    let state = {list: {}};

    let keys = VISITOR_KEYS[node.type];
    if (keys == null) return;

    let children = this.childReferences(node);
    let sourceElements = node.sourceElements = [];

    let prevNode;
    for (let l = children.length, i = 0; i < l; i++) {
      let nextChild = children[i];
      let nextNode = dereference(node, nextChild, state);
      if (nextNode === null && (node.type === "ArrayExpression" || node.type === "ArrayPattern")) {
        // Find postiion of hole, & create pseudo node

        // if it's the first item, the first comma we see is where the hole is,
        // otherwise, it's after the first comma, at the start of the next comma
        let seenComma = i === 0;
        for (let token, j = this.index; j < this.tokensLength && (token = this.tokens[j]).end <= node.end; j++) {
          if (token.type && token.type.label === ',') {
            if (seenComma) {
              nextNode = {start: token.start, end: token.start};
              Object.assign(nextChild, nextNode); // TODO: add loc
              break;
            } else {
              seenComma = true;
            }
          }
        }
        if (nextNode === null) throw new Error("Could not find postition of ArrayHole");
      }
      this.collect(node, prevNode, nextNode);
      sourceElements.push(nextChild);
      this.traverse(nextNode);
      prevNode = nextNode;
    }
    this.collect(node, prevNode);
  }

  collect(node, prevChild, nextChild) {
    let start = prevChild !== undefined ? prevChild.end : node.start;
    let end = nextChild !== undefined ? nextChild.start : node.end;
    let {sourceElements} = node;
    for (let token; this.index < this.tokensLength && (token = this.tokens[this.index]).end <= end; this.index++) {
      sourceElements.push(...this.captureWhitespace(start, token.start));
      // TODO: convert comments to commentHead + commentBody + commentTail
      let tokenType = token.type && token.type.label || token.type;
      sourceElements.push({
        element: TYPE_TO_ELEMENT[tokenType] || tokenType,
        value: this.source.slice(token.start, token.end),
        start: token.start,
        end: token.end,
        loc: token.loc,
      })
      start = token.end;
    }
    sourceElements.push(...this.captureWhitespace(start, end));
  }

  // generates properly sorted reference sourceElements for the node
  childReferences(node) {
    let listState = {}
    let h = {
      a: [...VISITOR_KEYS[node.type]],
      less(i, j) {
        return nodePos(node, this.a[i], listState) < nodePos(node, this.a[j], listState);
      },
      swap(i, j) { [this.a[i], this.a[j]] = [this.a[j], this.a[i]]; },
      len() { return this.a.length; },
      pop() { return this.a.pop(); },
      push(v) { return this.a.push(v); },
    }
    heap.init(h);

    let childReferences = [];
    let prevChild;
    while (h.a.length) {
      let nextChild = h.a[0];
      if (Array.isArray(node[nextChild])) {
        if (node[nextChild].length <= 0) {
          heap.pop(h);
          continue;
        }
        let childReference = {reference: `${nextChild}#next`};
        // prevChild = node[listState[nextChild] ?= 0]
        prevChild = node[nextChild][listState[nextChild] != null ? listState[nextChild] : (listState[nextChild] = 0)];
        if (prevChild === null) {
          childReference.element = "ArrayHole";
          childReference.value = "";
        }
        childReferences.push(childReference);
        listState[nextChild]++;
        if (listState[nextChild] < node[nextChild.length]) {
          heap.fix(h, 0);
        } else {
          heap.pop(h);
        }
      } else {
        let nextChildReference = heap.pop(h);
        let nextChild = node[nextChildReference];
        // only include if exists and not a shorthand property
        if (nextChild != null && !(prevChild && nextChild.start === prevChild.start && nextChild.end === prevChild.end)) {
          if (prevChild && VISITOR_KEYS[nextChild.type].some((key) => {
            let test = nextChild[key];
            return test && !Array.isArray(test) && test.start === prevChild.start && test.end === prevChild.end;
          })) {
            childReferences.pop();
          }
          childReferences.push({reference: nextChildReference});
        }
        prevChild = nextChild;
      }
    }
    return childReferences;
  }

  // this function adapted from gibson042's POC
  captureWhitespace(start, end) {
    let sourceElements = [];
    // Capture preceding whitespace, separating out line terminators
    if ( end > start ) {
      let str = this.source.slice(start, end);
      str.split(/(\r\n?|[\n\u2028\u2029])/).forEach(function(ws, i) {
        if ( !ws.length ) return;
        sourceElements.push({
          // `split` with captures alternates matches & separators
          element: i % 2 ? "LineTerminator" : "WhiteSpace",
          value: ws
        });
      });
    }
    return sourceElements;
  }
}

// Similar to dereference
function nodePos(parent, key, listState) {
  let c = parent[key];
  if (Array.isArray(c)) {
    if (c.length <= 0) return -1;
    // NOTE: with soak operator;
    // let n = c[listState[key] ?= 0]
    let n = c[listState[key] != null ? listState[key] : (listState[key] = 0)];
    if (n == null) return -1;
    return avg(n.start, n.end);
  } else {
    if (c == null) return -1;
    return avg(c.start, c.end);
  }
}

function avg(a, b) {
  return (a + b) / 2;
}
