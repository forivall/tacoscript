
import TacoscriptTokenBuffer from "./taco-buffer";

export default class TacoscriptPrinter extends TacoscriptTokenBuffer {
  tokenize(ast) {
    // prints the ast down into the buffer
    this._print(ast, null, {});
    this._finishPrint(ast, {});
  }

  print(parent, prop, opts = {}) {
    if (parent.tokenElements) {
      this._printWithTokenElements(parent, prop, opts);
    } else {
      this._print(parent[prop], parent, opts);
    }
  }

  _print(node, parent, opts) {
    this._startSimplePrint(node, parent, opts);
    this[node.type](node, parent, opts);
    // push mapping end pseudo-token
    // run opts.after
  }

  _printWithTokenElements(parent, prop, opts) {
    let node = parent[prop];
    this._startTokenElementPrint(parent, prop, opts);
    this[node.type](node, parent, opts);
    this._finishPrint(node, opts);
  }

  _startSimplePrint(node, parent, opts) {
    // print leading comments
    // catchup newlines
    // run opts.before
    // push mapping start pseudo-token
  }

  _startTokenElementPrint(parent, prop, opts) {
    let node = parent[prop];
    // print tokens between prev sibling and node
    // * preserve correct indentation syntax
    // * push mapping start pseudo-token before the first non-whitespace/comment token
    // * keep state to indicate if leading parens, etc. were printed
    // run opts.before
  }

  _startPrint(parent, prop, opts) {
    if (parent.tokenElements) {
      return this._startTokenElementPrint(parent, prop, opts);
    } else {
      return this._startSimplePrint(parent[prop], parent, opts);
    }
  }

  _finishPrint(node, opts) {
    if (node.tokenElements) {
      // print all remaining unprinted tokens
      // * preserve correct indentation syntax
      //   * make sure that, if the last token is a block, trailing tokens are indented
      //     appropriately
      // * push mapping end pseudo-token after the last non-whitespace/comment token
      // * keep state to indicate if trailing parens, etc. were printed
      // run opts.after
    } else {
      // push mapping end pseudo-token
      // run opts.after
      // print trailing comments
    }
  }

  printMultiple(parent, prop, opts = {}) {
    // TODO: create pseudocode
    //       take index into consideration
  }

  printStatements(parent, prop, opts = {}) {
    opts.statement = true;
    return this.printMultiple(parent, prop, opts);
  }

  printList(items, parent, opts = {}) {
    // TODO
    // for now, just print the commas
    // eventually, don't print commas if a newline is available as a separator.
    // when source isn't available, preference should be supplied in opts:
    //   array should use newlines
    //   arguments should use commas
    //   also, there will be a format option to always insert commas
  }

  printBlock(parent) {
    let prop = 'body';
    let node = parent.body;
    let opts = {};
    if (t.isBlock(node)) {
      this.indent();
      this._startPrint(parent, prop, opts);
      this._printSequence(node);
      this._finishPrint(node, opts)
      this.dedent();
    // } else if (t.isEmptyStatement(node)) {
    //   // probably not needed
    //   this.push({type: 'pass', after: [';', '\n']}, parent, prop, opts);
    } else {
      this.push('then');
      this.print(parent, prop);
    }
  }
}

import _printer from "./_printer";
Object.assign(TacoscriptPrinter.prototype, _printer);
