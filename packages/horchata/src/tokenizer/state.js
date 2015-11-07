import {types as tt} from "./types";
import {Position} from "../util/location";

export default class State {
  constructor(options, inputFile) {
    // TODO: decide if non-strict should be supported
    this.inputFile = inputFile;
    this.options = options;

    this.sourceFile = this.options.sourceFile;

    // Used to signal to callers of `readWord1` whether the word
    // contained any escape sequences. This is needed because words with
    // escape sequences must not be interpreted as keywords.
    this.containsEsc = false;

    // Set up token state

    // The current position of the tokenizer in the input.
    this.pos = this.lineStart = 0;
    this.curLine = 1;

    // The current indent level
    this.indentation = 0;
    // The detected whitespace used for indentation
    // This must be consistent through the file, or else it is a syntax error
    this.indentString = null;
    this.indentCharCode = -1;
    this.indentRepeat = -1;

    // Used to signal that we have already checked for indentation changes after
    // any upcoming newlines. Set to false after an indent or detent (or no
    // indentation change token) has been pushed, and reset to true after a newline
    // has been pushed.
    this.checkIndentation = true;
    // Used to signal if we will be skipping upcoming indentation
    this.inIndentation = true;

    // Properties of the current token:
    // Its type
    this.type = tt.eof;
    // For tokens that include more information than their type, the value
    this.value = null;
    // Its start and end offset
    this.start = this.end = this.pos;
    // And, if locations are used, the {line, column} object
    // corresponding to those offsets
    this.startLoc = this.endLoc = this.curPosition();

    // Position information for the previous token
    this.lastTokType = null;
    this.lastTokEndLoc = this.lastTokStartLoc = null;
    this.lastTokStart = this.lastTokEnd = this.pos;

    // The context stack is used to superficially track syntactic
    // context to predict whether a regular expression is allowed in a
    // given position.
    this.context = this.initialContext();
    this.exprAllowed = true;

    // Figure out if it's a module code.
    this.strict = this.inModule = this.options.sourceType === "module";

    // Used to signify the start of a potential arrow function
    this.potentialArrowAt = -1;

    // Flags to track whether we are in a function, a method, a generator, an async function.
    // inFunction is used for validity of `return`
    // inMethod is for `super`
    // TODO: check spec to see if super is allowed in any functions, add tests
    // inGenerator is for `yield`
    // inAsync is for `await`
    this.inFunction = this.inMethod = this.inGenerator = this.inAsync = false;
    // Labels in scope.
    this.labels = [];

    // List of currently declared decorators, awaiting attachment
    this.decorators = [];

    // All tokens parsed, will be attached to the file node at the end of parsing
    this.tokens = [];
    // All tokens and non-tokens parsed
    this.sourceElementTokens = [];

    // Flag for if we're in the deader of a "for" loop, to decidee if `while`
    // is for starting a loop or just to start the `test`
    this.inForHeader = false;
  }

  curPosition() {
    return new Position(this.curLine, this.pos - this.lineStart);
  }
}
