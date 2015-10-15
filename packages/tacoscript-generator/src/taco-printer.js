
// simple prints will print an ast, without regard for cst tokens
// preserved print will print an ast, while trying to preserve whitespace
// and other formatting included in cst tokens

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
    this._simplePrint(ast, null, {});
    this._finishPrint(ast, {});
  }

  print(parent, prop, opts = {}) {
    if (this.format.preserve && parent.tokenElements && parent.tokenElements.length) {
      this._preservedPrint(parent, prop, opts);
    } else {
      this._simplePrint(parent[prop], parent, opts);
    }
  }

  _simplePrint(node, parent, opts) {
    this._simpleStartPrint(node, parent, opts);
    if (!this[node.type]) { throw new Error(`Cannot print node of type ${node.type}`); }
    this[node.type](node, parent, opts);
    this._finishSimplePrint(node, opts);
  }

  _preservedPrint(parent, prop, opts) {
    let node = parent[prop];
    this._startPreservedPrint(parent, prop, opts);
    if (!this[node.type]) { throw new Error(`Cannot print node of type ${node.type}`); }
    this[node.type](node, parent, opts);
    this._finishPrint(node, opts);
  }

  _startPrint(parent, prop, opts) {
    if (this.format.preserve && parent.tokenElements && parent.tokenElements.length) {
      return this._startPreservedPrint(parent, prop, opts);
    } else {
      return this._simpleStartPrint(parent[prop], parent, opts);
    }
  }

  _simpleStartPrint(node, parent, opts) {
    // TODO: print leading comments
    // TODO: catchup newlines

    if (opts.before) { opts.before(); }

    // push mapping start pseudo-token
    this.push({type: 'MappingMark', loc: node.loc.start});
  }

  _startPreservedPrint(parent, prop, opts) {
    let node = parent[prop];
    throw new Error('Not Implemented');
    // print tokens between prev sibling and node
    // * preserve correct indentation syntax
    // * push mapping start pseudo-token before the first non-whitespace/comment token
    // * keep state to indicate if leading parens, etc. were printed
    // run opts.before
  }

  _finishPrint(node, opts) {
    if (this.format.preserve && node.tokenElements && node.tokenElements.length) {
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
      if (this.format.preserve && parent.tokenElements && parent.tokenElements.length) {
        // if a node of child: prop is found
        // * print tokens leading up to last node of child: prop
        throw new Error("Not Implemented");
      }
      return;
    }
    if (this.format.preserve && parent.tokenElements && parent.tokenElements.length) {
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
      this._simplePrintMultiple(nodes, parent, opts);
    }
  }

  _simplePrintMultiple(nodes, parent, opts) {
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
      if (node) {
        this._simplePrint(node, parent, printOpts);
      } else {
        // preserve holes, especially in arrays
        this.push("pass");
      }
    }

    if (opts.dedent) { this.dedent(); }
  }

  printStatements(parent, prop, opts = {}) {
    opts.statement = true;
    return this.printMultiple(parent, prop, opts);
  }

  printArguments(parent, prop = "arguments", opts = {}) {
    let node = parent[prop];
    if (this.format.preserve && node.tokenElements && node.tokenElements.length) {
      throw new Error('Not Implemented');
    } else {
      // a transform will be used, so don't worry about exec (!) style arguments here.
      // reminder: exec style arguments are an arguments list that instead of being surrounded
      // by parens, starts with a !
      //
      // if exec style can't be inferred, <!-- will be generated at the end of the line
      // so, ! ...arguments #<!-- will be an illegal expression in tacoscript.
      this.push("(");
      opts.separator = ",";
      this._simplePrintMultiple(node, parent, opts);
      this.push(")");
    }
  }

  // for array and object literals
  printLiteralBody(parent, prop, opts = {}) {
    let node = parent[prop];
    if (this.format.preserve && node.tokenElements && node.tokenElements.length) {
      throw new Error('Not Implemented');
    } else {
      opts.separator = {type: "newline"};
      this._simplePrintMultiple(node, parent, opts);
    }
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

  printBlock(parent, prop = 'body') {
    let node = parent[prop];
    let opts = {};
    // BlockStatement should only be printed with the generator when it is not
    // the body of a statement (such as if, etc.)
    if (t.isBlock(node)) {
      this.indent();
      this._startPrint(parent, prop, opts);
      this.printStatements(node, prop, opts);
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

import baseGenerators from "./generators/taco/base";
import classesGenerators from "./generators/taco/classes";
import expressionsGenerators from "./generators/taco/expressions";
import methodsGenerators from "./generators/taco/methods";
import statementsGenerators from "./generators/taco/statements";
import typesGenerators from "./generators/taco/types";
for (let generator of [
      baseGenerators,
      classesGenerators,
      expressionsGenerators,
      methodsGenerators,
      statementsGenerators,
      typesGenerators,
    ]) {
  Object.assign(TacoscriptPrinter.prototype, generator);
}
