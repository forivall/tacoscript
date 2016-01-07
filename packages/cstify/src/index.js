
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
        nextNode = this.findAndCreateArrayHole(node, i === 0);
        Object.assign(nextChild, nextNode); // TODO: add loc
      }
      this.collect(node, prevNode, nextNode);
      sourceElements.push(nextChild);
      this.traverse(nextNode);
      prevNode = nextNode;
    }
    this.collect(node, prevNode);
  }

  findAndCreateArrayHole(node, isFirstChild) {
    // Find postiion of hole, & create pseudo node

    // if it's the first item, the first comma we see is where the hole is,
    // otherwise, it's after the first comma, at the start of the next comma
    let seenComma = isFirstChild;
    for (let token, j = this.index; j < this.tokensLength && (token = this.tokens[j]).end <= node.end; j++) {
      if (token.type && token.type.label === ',') {
        if (seenComma) {
          return {start: token.start, end: token.start};
          break;
        } else {
          seenComma = true;
        }
      }
    }
    throw new Error("Could not find postition of ArrayHole");
  }

  // generate source elements from tokens and whitespace between the two children of `node`
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
    // Since some elements can generate multiple references, we can't just sort the
    // children and then flatten the list; instead, we use a minheap to sort the elements,
    // but in cases where the list will still generate more references, we ask the heap to
    // re-sort the element, according to the next element in the list.
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
    let prevChildNode;
    while (h.a.length) {
      let nextChild = h.a[0];
      if (Array.isArray(node[nextChild])) {
        // if this is an empty array
        if (node[nextChild].length <= 0) {
          // don't generate any references for it
          heap.pop(h);
          continue;
        }
        let childReference = {reference: `${nextChild}#next`};
        // if the childNode is null, it's a hole in an array
        // childNode = node[listState[nextChild] ?= 0]
        const childNode = node[nextChild][listState[nextChild] != null ? listState[nextChild] : (listState[nextChild] = 0)];
        if (childNode === null) {
          childReference.element = "ArrayHole";
          childReference.value = "";
        }
        prevChildNode = childNode; // for shorthand elimination: see below
        childReferences.push(childReference);
        listState[nextChild]++;
        if (listState[nextChild] < node[nextChild].length) {
          // if there's still more children in the array to process, re-heapify the child
          heap.fix(h, 0);
        } else {
          // otherwise, we're done with these children
          heap.pop(h);
        }
      } else {
        let nextChildReference = heap.pop(h);
        let childNode = node[nextChildReference];
        // if the childNode is omitted (optional), we don't include it
        // if the childNode was cloned as a shorthand of the previous childNode, we don't include it
        if (childNode != null && !(prevChildNode && childNode.start === prevChildNode.start && childNode.end === prevChildNode.end)) {
          // if the previous childNode is a child of the current childNode,
          if (prevChildNode && VISITOR_KEYS[childNode.type].some((key) => {
            let test = childNode[key];
            return test && !Array.isArray(test) && test.start === prevChildNode.start && test.end === prevChildNode.end;
          })) {
            // then we remove the previous childNode, since it has been included in the currentChild as shorthand
            childReferences.pop();
          }
          childReferences.push({reference: nextChildReference});
        }
        prevChildNode = childNode;
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
      let pos = start;
      str.split(/(\r\n?|[\n\u2028\u2029])/).forEach(function(ws, i) {
        if ( !ws.length ) return;
        sourceElements.push({
          // `split` with captures alternates matches & separators
          element: i % 2 ? "LineTerminator" : "WhiteSpace",
          value: ws,
          start: pos,
          end: (pos += ws.length)
          // TODO: pos
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
