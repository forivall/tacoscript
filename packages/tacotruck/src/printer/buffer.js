
/**
 * Tacoscript's code generator, turns an ast into tacoscript code
 */

import sourceMap from "source-map";
import Position from "./position";
import {Token, tokTypes as tt, keywordTypes as kw, whitespace as ws} from "horchata";
import isString from "lodash/isString";
import equalsDeep from "lodash/isEqual";
import "./special-tokens";

// TODO: move to tacoscript-options package
function normalizeOptions(input) {
  if (input == null) throw new Error("Unexpected null or undefined options");
  let inputDialect = input.dialect || {};
  // TODO: console.warn about unknown opts
  let opts = {};
  opts.dialect = {};
  opts.dialect["equality-symbols"] = !!inputDialect["equality-symbols"];
  opts.format = input.format || {};
  // TODO: plugins
  return opts;
}

export default class TacoBuffer {

  constructor(opts, code) {
    this._initSourceMap(opts, code);
    opts = normalizeOptions(opts);
    this.opts = opts;
    this.format = opts.format;
    this.dialect = opts.dialect;
    this.tokens = [new Token(tt.tab, 0)];
    this._indent = 0;
    this._lastIndent = 0;
    this.curLine = 1;

    // serialization state
    this.position = new Position();
    this.code = code;
    this.output = '';

    this._warnings = [];
  }

  /**
   * Checks
   */
  isLast(state) {
    state = TacoBuffer._massageTokenState(state);
    let last = this._last();
    return last.type === state.type && equalsDeep(last.value, state.value);
  }

  isLastType(type) {
    if (this.tokens.length <= 0) return false;
    let last = this._last();
    return last.type === type;
  }

  lastTokenIsNewline() {
    return this.isLastType(tt.newline);
  }

  _lastOffset(offset = 1) {
    let i = offset;
    for (let len = this.tokens.length;
        i <= len && this.tokens[len - i].type === tt.mappingMark;
        i++) {}
    return i;
  }

  _last() {
    return this.__last || (this.__last = this.tokens[this.tokens.length - this._lastOffset()]);
  }

  _pop() {
    this.__last = undefined;
    var i, len, token;
    for (i = 1, len = this.tokens.length;
        i <= len && (token = this.tokens[len - i]).type === tt.mappingMark;
        i++) {}
    this.tokens.splice(len - i, 1);
    return token;
  }

  /**
   * Source Map
   */

  _initSourceMap(opts, code) {
    if (opts.sourceMaps) {
      if (!opts.sourceFileName) {
        throw new Error("sourceFileName must be set when generating source maps")
      }
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

  newline(force) {
    if (force || !this.lastTokenIsNewline()) this._push({type: tt.newline});
  }


  lineTerminator() {
    this.newline();
  }

  startBlock() {
    this.newline();
  }

  indent() {
    // TODO: make sure that indent only occurs right before a newline
    this._indent++;
    if (this.lastTokenIsNewline()) {
      let newline = this._pop();
      this._insertIndentTokens();
      this.tokens.push(newline);
    }
  }

  dedent() {
    this._indent--;
    if (this.lastTokenIsNewline()) {
      let newline = this._pop();
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

  flush() {
    let lastOffset = this._lastOffset();
    if (this.tokens[this.tokens.length - lastOffset].type !== tt.newline) {
      this.onWarning("Last token is not a newline");
      let last = this._last();
      if (last != null && last.type === tt.newline) {
        this.tokens.splice(lastOffset, this.tokens.length);
      }
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
    // avoid redundant mapping marks
    if (state.type === tt.mappingMark) {
      if (this._isRedundantMappingMark(state)) { return; }
      this.tokens.push(Token.fromState(state));
      return;
    }

    if (state.type === tt.newline) {
      this.curLine++;
      this._insertIndentTokens();
    } else if (this.lastTokenIsNewline()) {
      this.tokens.push(new Token(tt.tab, this._indent));
    }

    if (state.type === tt.blockCommentBody || state.type === tt.template || state.type === tt.string) {
      this.curLine += state.value.code.split(ws.lineBreakG).length - 1;
    }

    this._insertForceSpace(state) || this._insertFormattingSpace(state);

    this.tokens.push(Token.fromState(state));
    this.__last = undefined;
  }

  _insertIndentTokens() {
    if (this._indent !== this._lastIndent) {
      if (this._indent > this._lastIndent) {
        for (let i = this._indent - this._lastIndent; i > 0; i--) {
          this.tokens.push(new Token(tt.indent));
        }
      } else {
        for (let i = this._lastIndent - this._indent; i > 0; i--) {
          this.tokens.push(new Token(tt.dedent));
        }
      }
      this._lastIndent = this._indent;
    }
  }

  // TODO: reduce duplication between force space and formatting space.

  _insertForceSpace(state) {
    let force = state.type.forceSpaceWhenAfter;
    if (!force) { return false; }
    let last = this._last();
    if (last == null) { return false; }
    let isForced = force[last.type.key] || last.type.keyword && force.keyword;
    if (!isForced) { return false; }

    if (isForced === true || isForced(last, state)) {
      this.tokens.push(new Token(tt.whitespace, {code: ' '}));
      return true;
    }
    return false;
  }

  _insertFormattingSpace(state) {
    if (this.format.compact) return false;
    let last = this._last();

    let insertFormatting = last && last.type.formattingSpaceAfter;
    if (insertFormatting === true && state.type === tt.newline) insertFormatting = false;
    if (!insertFormatting) {
      let formatting = state.type.formattingSpaceWhenAfter;
      if (!formatting) { return false; }
      if (last == null) { return false; }
      insertFormatting = formatting[last.type.key] || last.type.keyword && formatting.keyword;
    }
    if (!insertFormatting) { return false; }

    if (insertFormatting === true || insertFormatting(last, state)) {
      this.tokens.push(new Token(tt.whitespace, {code: ' '}));
      return true;
    }
    return false;
  }

  _isRedundantMappingMark(state) {
    if (this.tokens.length <= 0) return false;
    let last = this.tokens[this.tokens.length - 1];

    if (state.type === tt.mappingMark && last.type === tt.mappingMark) {
      if (state.value.pos === last.value.pos) {
        return true;
      }
    }
    return false;
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
    code = token.type.toCode(token, this);
    origLoc = token.origLoc || token.loc;
    if (origLoc) this.mark(origLoc.start);
    this.output += code;
    this.position.push(code);
    if (origLoc) this.mark(origLoc.end);
  }

  // Warnings

  onWarning(warning) {
    // default; can be overwritten by opts
    // console.warn(warning);
    this._warnings.push(warning);
  }
}
