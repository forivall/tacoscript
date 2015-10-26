
import Parser from "babylon/lib/parser";
import { Token } from "babylon/lib/tokenizer";
import TokenizerState from "babylon/lib/tokenizer/state";
import { types as tt } from "babylon/lib/tokenizer/types";
import { nonASCIIwhitespace } from "babylon/lib/util/whitespace";

var pp = Parser.prototype;

function peek(arr) { return arr[arr.length - 1]; }

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
    this.cstState.nodeStack[0]._tokenElements.push(new Token(this.whitespaceState));
  }
};

pp.startNodeTokens = function() {
  let tokens = this.cstState.orphanTokens;
  this.cstState.orphanTokens = [];
  return tokens;
}

function hasTrailingComma(tokens, terminator = tt.parenR) {
  let i = tokens.length - 1;
  for (; i >= 0; i--) {
    if (tokens[i].type === "Whitespace") {
      continue;
    }
    if (tokens[i].type !== terminator) {
      throw new Error(`Unexpected token ${tokens[i].type.label}`);
    }
    break;
  }
  i--;
  for (; i >= 0; i--) {
    if (tokens[i].type === "Whitespace") {
      continue;
    }
    return tokens[i].type === tt.comma;
  }
}

export default function(instance) {
  instance.whitespaceState = new TokenizerState();
  instance.whitespaceState.init({}, instance.state.input);
  instance.whitespaceState.type = "Whitespace";

  instance.cstState = {
    nodeStack: [],
    orphanTokens: []
  };

  instance.extend("skipSpace", function(/*inner*/ /*complete override*/) {
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

  // TODO: instead of complete override, look at previous tokens to see if
  // it has parens
  instance.extend("parseNew", function() {
    return function parseNew() {
      let node = this.startNode();
      let meta = this.parseIdent(true);

      if (this.eat(tt.dot)) {
        node.meta = meta;
        node.property = this.parseIdent(true);

        if (node.property.name !== "target") {
          this.raise(node.property.start, "The only valid meta property for new is new.target");
        }

        return this.finishNode(node, "MetaProperty");
      }

      node.callee = this.parseNoCallExpr();

      if (this.eat(tt.parenL)) {
        node.arguments = this.parseExprList(tt.parenR, this.options.features["es7.trailingFunctionCommas"]);
        this.toReferencedList(node.arguments);
      } else {
        node.emptyArguments = true;
        node.arguments = [];
      }

      return this.finishNode(node, "NewExpression");
    };
  });

  instance.extend("parseCallExpressionArguments", function(inner) {
    return function parseCallExpressionArguments(close, allowTrailingComma, possibleAsyncArrow) {
      var res = inner.apply(this, arguments);
      if (allowTrailingComma && hasTrailingComma(this.state.tokens)) {
        res.hasTrailingComma = true;
      }
      return res;
    }
  });
  instance.extend("parseBindingList", function (inner) {
    return function parseBindingList(close, allowEmpty, allowTrailingComma) {
      var res = inner.apply(this, arguments);
      if (allowTrailingComma && hasTrailingComma(this.state.tokens, tt.bracketR)) {
        res.hasTrailingComma = true;
      }
      return res;
    }
  });
  instance.extend("parseExprList", function(inner) {
    return function parseExprList(close, allowTrailingComma, allowEmpty, refShorthandDefaultPos) {
      var res = inner.apply(this, arguments);
      if (allowTrailingComma && hasTrailingComma(this.state.tokens, tt.bracketR)) {
        res.hasTrailingComma = true;
      }
      return res;
    }
  });

  instance.extend("next", function(inner) {
    return function next() {
      if (!this.isLookahead) {
        this.cstState.nodeStack[0]._tokenElements.push(new Token(this.state));
      }
      let value = inner.apply(this, arguments);
      return value;
    }
  });

  instance.extend("startNodeAt", function(inner) {
    return function startNodeAt(pos) {
      if (this.state.start < pos) throw new Error(`Node started later than possible: ${this.state.start} < ${pos}`);
      let node = inner.apply(this, arguments);
      node._tokenElements = this.startNodeTokens();
      parentNodeLoop: for (let parentNode of (this.cstState.nodeStack: Array)) {
        while (parentNode._tokenElements.length > 0) {
          if (peek(parentNode._tokenElements).start >= pos) break parentNodeLoop;
          node._tokenElements.push(parentNode._tokenElements.pop());
        }
      }
      this.cstState.nodeStack.unshift(node);
      return node;
    }
  })

  instance.extend("startNode", function(inner) {
    return function startNode(pos) {
      let node = inner.apply(this, arguments);
      this.cstState.nodeStack.unshift(node);
      node._tokenElements = this.startNodeTokens();
      return node;
    }
  })

  instance.extend("finishNode", function(inner) {
    return function finishNode(pos) {
      let node = inner.apply(this, arguments);
      this.cstState.nodeStack.shift();
      let parentNode = this.cstState.nodeStack[0];
      if (parentNode != null) parentNode._tokenElements.push(node);
      return node;
    }
  })

  instance.extend("finishNodeAt", function(inner) {
    return function finishNodeAt(node_, type, pos) {
      if (this.state.lastTokEnd < pos) throw new Error(`Node ended sooner than possible: ${this.state.lastTokeEnd} < ${pos}`);
      let node = inner.apply(this, arguments);

      while (node._tokenElements.length > 0) {
        if (peek(node._tokenElements).end >= pos) break;
        this.cstState.orphanTokens.push(node._tokenElements.pop());
      }
      this.cstState.nodeStack.shift();
      let parentNode = this.cstState.nodeStack[0];
      if (parentNode != null) parentNode._tokenElements.push(node);
      return node;
    }
  });

  instance.extend("parseTopLevel", function(inner) {
    return function parseTopLevel() {
      let ast = inner.apply(this, arguments);
      // TODO: traverse tree, and replace references in _tokenElements to path lookups,
      // TODO: convert _tokenElements to tokenElements.
      return ast;
    }
  });
}
