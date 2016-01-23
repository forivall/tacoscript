/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

import {lineBreakG} from "./whitespace";

// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.

export class Position {
  constructor(line, col) {
    this.line = line;
    this.column = col;
  }

  offset(n) {
    return new Position(this.line, this.column + n);
  }

  clone() {
    return this.offset(0);
  }
}

export class SourceLocation {
  constructor(parent, start, end) {
    this.start = start;
    this.end = end;
    if (parent.sourceFile !== null) this.source = parent.sourceFile;
    else if (parent.source !== null) this.source = parent.source;
  }
  clone() {
    return new SourceLocation(this, this.start && this.start.clone(), this.end && this.end.clone());
  }
}

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

export function getLineInfo(input, offset) {
  for (let line = 1, cur = 0;;) {
    lineBreakG.lastIndex = cur;
    let match = lineBreakG.exec(input);
    if (match && match.index < offset) {
      ++line;
      cur = match.index + match[0].length;
    } else {
      return new Position(line, offset - cur);
    }
  }
}

// TODO: use https://github.com/lydell/line-numbers or babel-code-frame to
// display parsing errors
