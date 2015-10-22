
// import * as bt from "babel-core/lib/types";
// import compact from "lodash/array/compact";
// import flatten from "lodash/array/flatten";

import Parser from "babylon/lib/parser";
import { nonASCIIwhitespace } from "babylon/lib/util/whitespace";
import TokenizerState from "babylon/lib/tokenizer/state";
import { Token } from "babylon/lib/tokenizer";

var pp = Parser.prototype;

pp.startWhitespace = function() {
  this.whitespaceState.start = this.state.pos;
  this.whitespaceState.startLoc = this.state.curPosition();
  this.whitespaceState.value = '';
};

pp.finishWhitespace = function() {
  this.whitespaceState.end = this.state.pos;
  this.whitespaceState.endLoc = this.state.curPosition();
  if (this.whitespaceState.end > this.whitespaceState.start) {
    this.state.tokens.push(new Token(this.whitespaceState));
  }
};

export default function(instance) {
  instance.whitespaceState = new TokenizerState();
  instance.whitespaceState.init({}, instance.state.input);
  instance.whitespaceState.type = "Whitespace";

  // instance.extend("eat", function(inner) {
  //   return function(type) {
  //     return inner.call(this, type);
  //   };
  // });

  instance.extend("skipSpace", function(inner) {
    return function skipSpace() {
      this.startWhitespace();
      loop: while (this.state.pos < this.input.length) {
        let ch = this.input.charCodeAt(this.state.pos);
        switch (ch) {
          case 32: case 160: // ' '
            this.whitespaceState.value += String.fromCharCode(ch);
            ++this.state.pos;
            break;

          case 13: // \r\n
            if (this.input.charCodeAt(this.state.pos + 1) === 10) {
              this.whitespaceState.value += '\r\n';
              this.state.pos += 2;
              ++this.state.curLine;
              this.state.lineStart = this.state.pos;
              break;
            }

          case 10: case 8232: case 8233:
            this.whitespaceState.value += String.fromCharCode(ch);
            ++this.state.pos;
            ++this.state.curLine;
            this.state.lineStart = this.state.pos;
            break;

          case 47: // '/'
            this.finishWhitespace();
            switch (this.input.charCodeAt(this.state.pos + 1)) {
              case 42: // '*'
                this.skipBlockComment();
                this.startWhitespace();
                break;

              case 47:
                this.skipLineComment(2);
                this.startWhitespace();
                break;

              default:
                break loop;
            }
            break;

          default:
            if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
              this.whitespaceState.value += String.fromCharCode(ch);
              ++this.state.pos;
            } else {
              this.finishWhitespace();
              break loop;
            }
        }
      }
    };
  });

  // instance.extend("startNode", function(inner) {
  //   return function() {
  //     var node = inner.call(this);
  //     node.tokenStart = this.state.tokens.length;
  //     return node;
  //   };
  // });
  //
  // instance.extend("startNodeAt", function(inner) {
  //   return function(pos, loc) {
  //     var node = inner.call(this, pos, loc);
  //
  //     let tokens = this.state.tokens, i;
  //     for (i = tokens.length - 1; i >= 0; i--) { if (tokens[i].start < pos) { break; } }
  //     node.tokenStart = i + 1;
  //
  //     return node;
  //   };
  // });

  // function finishNode(node) {
  //   let visitors = bt.VISITOR_KEYS[node.type];
  //   let childNodes = compact(flatten(visitors.map((v) => node[v])));
  //   node.children = childNodes;
  // }
  //
  // instance.extend("finishNode", function(inner) {
  //   return function(origNode, type) {
  //     var node = inner.call(this, origNode, type);
  //
  //     node.tokenEnd = this.state.tokens.length;
  //     node.tokens = this.state.tokens.slice(node.tokenStart);
  //
  //     finishNode(node);
  //     return node;
  //   };
  // });
  //
  // instance.extend("finishNodeAt", function(inner) {
  //   return function(origNode, type, pos, loc) {
  //     var node = inner.call(this, origNode, type, pos, loc);
  //
  //     let tokens = this.state.tokens, i;
  //     for (i = tokens.length - 1; i > 0; i--) { if (tokens[i].end <= pos) { break; } }
  //     node.tokenEnd = i;
  //     node.tokens = tokens.slice(node.tokenStart, node.tokenEnd);
  //
  //     finishNode(node);
  //     return node;
  //   };
  // });
}
