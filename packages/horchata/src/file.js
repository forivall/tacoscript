// TODO: allow simple conversion to and from vinyl files. maybe.
import Node from "./parser/node";
import {Position} from "./util/location";

export default class File extends Node {
  constructor(input, options, metadata = {}) {
    super({options}, 0, new Position(1, 0), 0);
    this.input = input;
    this.filename = metadata.filename;
    this.sourceType = metadata.sourceType || "module";

    this.type = "File";
    // populated by the parser
    this.program = null;
    // will be populated by the tokenizer once it detects the indent style
    this.format = {indent: null};
    // populated by from the tokenizer's `state` after parsing is complete
    this.tokens = null;
    this.sourceElementTokens = null;
    // populated by parser after parsing is complete
    this.map = null;
  }

  toJSON() {
    return {
      type: this.type,
      sourceType: this.sourceType,
      program: this.program,
      filename: this.filename,
      format: this.format,
      tokens: this.tokens,
      sourceElements: this.sourceElements,
    }
  }
}
