
/**
 * Tacoscript's code generator, turns an ast into tacoscript code
 */

import sourceMap from "source-map";
import Position from "./position";
import {types as tt, keywords as kw} from "horchata/lib/tokenizer/types";
import {TacoToken as Token} from "horchata/lib/tokenizer"
import isString from "lodash/lang/isString";
import equalsDeep from "lodash/lang/isEqual";

export default class TacoBuffer {

  constructor(opts, code) {
    this._initSourceMap(opts, code);
    this.opts = opts;
    this.format = opts.format;
    this.tokens = [];
    this._indent = 0;
    this._lastIndent = 0;

    // serialization state
    this.position = new Position();
    this.code = code;
    this.output = '';
  }

  /**
   * Checks
   */
  isLast(state) {
    state = TacoBuffer._massageTokenState(state);
    let last = this.tokens[this.tokens.length - 1];
    return last.type === state.type && equalsDeep(last.value, state.value);
  }

  isLastType(type) {
    let last = this.tokens[this.tokens.length - 1];
    return last.type === type;
  }

  /**
   * Source Map
   */

  _initSourceMap(opts, code) {
    if (opts.sourceMaps) {
      this.map = new sourceMap.SourceMapGenerator({
        file: opts.sourceMapTarget,
        sourceRoot: opts.sourceRoot
      });
      this.map.setSourceContent(opts.sourceFileName, code);
    } else {
      this.map = null;
    }
  }

  mark(original) {
    if (!this.map) return;
    // use current location to mark the source map
    let position = this.position;
    this.map.addMapping({
      source: this.opts.sourceFileName,
      generated: {
        line: position.line,
        column: position.column
      },
      original: original
    });
  }

  /**
   * Tokenization
   */

  newline() {
    this._push({type: tt.newline});
  }

  indent() {
    // TODO: make sure that indent only occurs right before a newline
    this._indent++;
    if (this.isLastType(tt.newline)) {
      let newline = this.tokens.pop();
      this._insertIndentTokens();
      this.tokens.push(newline);
    }
  }

  dedent() {
    this._indent--;
    if (this.isLastType(tt.newline)) {
      let newline = this.tokens.pop();
      this._insertIndentTokens();
      this.tokens.push(newline);
    }
  }

  keyword(name) {
    this._push({type: kw[name]});
  }

  push(..._tokenStates) {
    let tokenStates = _tokenStates; // babel#2539
    for (let token of (tokenStates: Array)) {
      this._push(token);
    }
  }

  /**
   * TODO: move this to documentation
   * in generators, the tokens that have to be manually defined are:
   * num
   *  * will need custom serialization logic too
   *  * value should store actual number value, base and original code
   * regexp
   *  * will need custom serialization logic too
   *  * value should store the literal, flags and original code
   * string
   *  * will need custom serialization logic too
   *  * value should store actual string value, quote types, and original code
   * name
   *  * value should store the parsed name and the original code
   * tab
   *  * todo: decide if length should be stored on tokenization, or generated
   *  during serialization
   * indent
   * dedent
   * whitespace (should only be emitted by catchup code)
   * newline
   * blockCommentBody
   * lineCommentBody
   */

  static _massageTokenState(state) {
    if (isString(state)) {
      state = Token.stateFromCode(state);
    } else if (isString(state.type)) {
      state.type = tt[state.type];
    }
    return state;
  }

  _push(state) {
    state = TacoBuffer._massageTokenState(state);
    if (state.type === tt.newline) {
      this._insertIndentTokens()
    }
    // TODO: ensure leading tab tokens, unless in parenthetized expression context
    this.tokens.push(new Token(state));
  }

  _insertIndentTokens() {
    if (this._indent !== this._lastIndent) {
      if (this._indent > this._lastIndent) {
        for (let i = this._indent - this._lastIndent; i > 0; i--) {
          this.tokens.push(new Token({type: tt.indent}));
        }
      } else {
        for (let i = this._lastIndent - this._indent; i > 0; i--) {
          this.tokens.push(new Token({type: tt.dedent}));
        }
      }
      this._lastIndent = this._indent;
    }
  }

  /**
   * Serialization
   */

  stringify() {
    for (let token of (this.tokens: Array)) {
      this._serialize(token);
    }
    return this.output;
  }

  preview() {
    return this.tokens.join('');
  }

  _serialize(token) {
    let code, origLoc;
    if (token.type === tt.mappingMark) {
      this.mark(token.value.loc);
      return;
    }
    code = token.type.toCode(token);
    origLoc = token.origLoc || token.loc;
    if (origLoc) this.mark(origLoc.start);
    this.output += code;
    this.position.push(code);
    if (origLoc) this.mark(origLoc.end);
  }

}
