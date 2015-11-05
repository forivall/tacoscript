// TODO: allow simple conversion to and from vinyl files. maybe.
import Node from "./parser/node";
import {Position} from "./util/location";

export default class File extends Node {
  constructor(input, options, metadata) {
    super({options}, 0, new Position(1, 0), 0);
    this.input = input;
    this.filename = metadata.filename;
    this.sourceType = metadata.sourceType || "module";

    this.type = "File";
    this.program = null;
    this.tokens = null;
  }

  toJSON() {
    return {
      type: this.type,
      program: this.program,
      tokens: this.tokens,
      sourceElements: this.sourceElements,
    }
  }
}
