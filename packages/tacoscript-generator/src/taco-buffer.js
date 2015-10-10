
/**
 * Tacoscript's code generator, turns an ast into tacoscript code
 */

import sourceMap from "source-map";
import Position from "./position";
import {types as tt, keywords as kw} from "horchata/lib/types";
import {TacoToken as Token} from ""
import isString from "lodash/lang/isString";

export default class TacoscriptTokenBuffer {

  constructor(opts, code) {
    this._initSourceMap(opts, code);
    this.opts = opts;
    this.tokens = [];

    // serialization state
    this.position = new Position();
    this.code = code;
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

  indent() {
    // TODO: make sure that indent only occurs right before a newline
    this._push({type: tt.indent});
  }

  dedent() {
    this._push({type: tt.dedent});
  }

  keyword(name) {
    this._push({type: kw[name]});
  }

  push(...tokenStates) {
    for (let token of (tokenStates: Array)) {
      this._push(token);
    }
  }

  _push(state) {
    if (isString(state)) {
      state = Token.stateFromCode(state);
    }
    // TODO: ensure leading indent, unless in parenthetized expression context
    this.tokens.push(new Token(state));
  }

  /**
   * Serialization
   */

  stringify() {
    // probably can be shared; move to _buffer if possible.
    // calculate position and source map as tokens are serialized into code
  }

  _serialize(token) {
    let stringOfToken;
    // TODO: perform magic
    this.output += stringOfToken;
    this.position.push(stringOfToken);
  }

}
