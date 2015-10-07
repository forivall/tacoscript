
import isArray from "lodash/lang/isArray";
import { default as t } from "babel-types";

import TacoscriptTokenBuffer from "./taco-buffer";

export default class TacoscriptPrinter extends TacoscriptTokenBuffer {
  constructor(ast, opts, code) {
    super(opts, code);
    this.ast = ast;
    this.code = code;
  }

  tokenize() {
    let ast = this.ast;
    // prints the ast down into the buffer
    this._print(ast, null, {});
    this._finishPrint(ast, {});
  }

  print(parent, prop, opts = {}) {
    if (parent.tokenElements && parent.tokenElements.length) {
      this._printWithTokenElements(parent, prop, opts);
    } else {
      this._print(parent[prop], parent, opts);
    }
  }

  _print(node, parent, opts) {
    this._startSimplePrint(node, parent, opts);
    this[node.type](node, parent, opts);
    this._finishSimplePrint(node, opts);
  }

  _printWithTokenElements(parent, prop, opts) {
    let node = parent[prop];
    this._startTokenElementPrint(parent, prop, opts);
    this[node.type](node, parent, opts);
    this._finishPrint(node, opts);
  }

  _startPrint(parent, prop, opts) {
    if (parent.tokenElements && parent.tokenElements.length) {
      return this._startTokenElementPrint(parent, prop, opts);
    } else {
      return this._startSimplePrint(parent[prop], parent, opts);
    }
  }

  _startSimplePrint(node, parent, opts) {
    // TODO: print leading comments
    // TODO: catchup newlines

    if (opts.before) { opts.before(); }

    // push mapping start pseudo-token
    this.push({type: 'MappingMark', loc: node.loc.start});
  }

  _startTokenElementPrint(parent, prop, opts) {
    let node = parent[prop];
    throw new Error('Not Implemented');
    // print tokens between prev sibling and node
    // * preserve correct indentation syntax
    // * push mapping start pseudo-token before the first non-whitespace/comment token
    // * keep state to indicate if leading parens, etc. were printed
    // run opts.before
  }

  _finishPrint(node, opts) {
    if (node.tokenElements) {
      throw new Error('Not Implemented');
      // print all remaining unprinted tokens
      // * preserve correct indentation syntax
      //   * make sure that, if the last token is a block, trailing tokens are indented
      //     appropriately
      // * push mapping end pseudo-token after the last non-whitespace/comment token
      // * keep state to indicate if trailing parens, etc. were printed
      // run opts.after
    } else {
      this._finishSimplePrint(node, opts)
    }
  }

  _finishSimplePrint(node, opts) {
    // push mapping end pseudo-token
    this.push({type: 'MappingMark', loc: node.loc.end});

    if (opts.after) { opts.after(); }
    // TODO: print trailing comments
  }

  printMultiple(parent, prop, opts = {}) {
    let nodes = parent[prop];
    if (!nodes || !nodes.length) {
      if (parent.tokenElements && parent.tokenElements.length) {
        // if a node of child: prop is found
          // print tokens leading up to last node of child: prop
      }
      return;
    }
    if (parent.tokenElements && parent.tokenElements.length) {
      throw new Error("Not Implemented");
      // Iterate through tokenElements
      // print tokens leading
      // TODO: use a Map
      // print tokens between first of list and preceding sibling
      // print first child
      // iterate through rest of children
      //   * print tokens between prev child and this child
      //   * print child
      //   * if a token element that isn't prop is found
      //     * if there are more token elements of child: prop in the list
      //       * throw invalid ast
      //     * else switch to simple printing
      // if more token elements of child: prop are in the list
      // * print the remaining tokens leading up to the last element of child: prop
    } else {
      let len = nodes.length;
      let separator = opts.separator
        ? isArray(opts.separator)
          ? opts.separator : [opts.separator]
        : [];
      let node, i;

      if (opts.indent) { this.indent(); }

      let printOpts = {
        statement: opts.statement,
        after: () => {
          if (opts.iterator) { opts.iterator(node, i); }
          if (opts.separator && i < len - 1) {
            this.push(...separator);
          }
        }
      }

      for (i = 0; i < len; i++) {
        node = nodes[i];
        this._print(node, parent, printOpts);
      }

      if (opts.dedent) { this.dedent(); }
    }
  }

  printStatements(parent, prop, opts = {}) {
    opts.statement = true;
    return this.printMultiple(parent, prop, opts);
  }

  printList(parent, prop, opts = {}) {
    if (opts.separator == null) {
      opts.separator = {type: ','};
    }
    return this.printMultiple(parent, prop, opts);
    // TODO
    // eventually, don't print commas if a newline is available as a separator.
    // when source isn't available, preference should be supplied in opts:
    //   array should use newlines
    //   arguments should use commas
    //   also, there will be a format option to always insert commas
    // this will be passed as an argument to printMultiple
  }

  printBlock(parent) {
    let prop = 'body';
    let node = parent.body;
    let opts = {};
    // BlockStatement should only be printed with the generator when it is not
    // the body of a statement (such as if, etc.)
    if (t.isBlock(node)) {
      this.indent();
      this._startPrint(parent, prop, opts);
      this.printStatements(node, 'body', opts);
      this._finishPrint(node, opts);
      this.dedent();
    // } else if (t.isEmptyStatement(node)) {
    //   // probably not needed
    //   this.push({type: 'pass', after: [';', '\n']}, parent, prop, opts);
    } else {
      // This is a single statement with no surrounding braces
      this.push('then');
      this.print(parent, prop);
    }
  }
}

import _printer from "./_printer";
Object.assign(TacoscriptPrinter.prototype, _printer);
