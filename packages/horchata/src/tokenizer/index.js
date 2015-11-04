/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

// TODO: rename to lexer everywhere in the code.

// import {types as tt} from "./types";
import {reservedWords, keywords} from "../util/identifier";
import State from "./state";
export {default as Token} from "./token";

function keywordRegexp(words) {
  return new RegExp("^(" + words.join("|") + ")$");
}

export default class Lexer {
  // TODO: move input to parse(), change otions os that it only contains options
  // that are generic, no options that pertain to the source file
  constructor(options, input) {
    // TODO: move these regexes to lexer
    this.keywords = keywordRegexp([].concat(keywords, reservedWords.tacoscript))
    this.reservedWords = keywordRegexp([].concat(reservedWords.es2015, reservedWords.strict));
    this.reservedWordsStrictBind = keywordRegexp([].concat(reservedWords.es2015, reservedWords.strict, reservedWords.strictBind))
    this.input = "" + input;

    // TODO: move this call to parsing
    this.init();
  }

  // call this prior to start parsing
  init() {
    this.state = new State(this.options, this.input);

  }

  // TODO: parse hash bang line as comment

}
