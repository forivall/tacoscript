
import Parser from "babylon/lib/parser";
import { Token } from "babylon/lib/tokenizer";
import TokenizerState from "babylon/lib/tokenizer/state";
import { types as tt } from "babylon/lib/tokenizer/types";
import { nonASCIIwhitespace } from "babylon/lib/util/whitespace";

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
}
