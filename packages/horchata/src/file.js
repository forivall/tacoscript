// TODO: allow simple conversion to and from vinyl files. maybe.
import Node from "./parser/node";
import {Position} from "./util/location";

export default class File extends Node {
  constructor(input, options, metadata = {}) {
    super({options}, {start: 0, startLoc: new Position(1, 0), index: 0});

    // TODO: allow input to be a buffer or a stream
    this.input = input;
    this.filename = metadata.filename;

    this.type = "File";
    // populated by the parser
    this.program = null;
    // will be populated by the tokenizer once it detects the indent style
    this.format = {indent: null};
    // populated by from the tokenizer's `state` after parsing is complete
    this.tokens = null;
    this.sourceElementsTokens = null;
    this.comments = null;
    // populated by parser after parsing is complete
    this.map = null;

    // internal
    this._childReferences = [];
  }

  toJSON() {
    return {
      type: this.type,
      sourceLanguage: this.sourceLanguage,
      sourceType: this.sourceType,
      program: this.program,
      filename: this.filename,
      format: this.format,
      tokens: this.tokens,
      [this._sourceElementsKey]: this[this._sourceElementsKey],
      comments: this.comments,
    };
  }
}
