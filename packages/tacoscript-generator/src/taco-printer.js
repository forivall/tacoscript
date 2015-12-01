
// simple prints will print an ast, without regard for cst tokens
// preserved print will print an ast, while trying to preserve whitespace
// and other formatting included in cst tokens

import isArray from "lodash/lang/isArray";
import * as t from "babel-types";

import TacoscriptTokenBuffer from "./taco-buffer";
import {types as tt} from "horchata/lib/tokenizer/types";

function isParenthesized(node) {
  return node.extra != null && node.extra.parenthesized || node.parenthesizedExpression;
}

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
    if (this.opts.sourceMaps) {
      this.push({type: 'mappingMark', value: {loc: node.loc.start, pos: node.start}});
    }
    if (isParenthesized(node) && !t.isObjectExpression(node)) this.push("(");
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
    this.flush();
  }

  _finishSimplePrint(node, opts) {
    if (isParenthesized(node) && !t.isObjectExpression(node)) this.push(")");
    // push mapping end pseudo-token
    if (this.opts.sourceMaps) {
      this.push({type: 'mappingMark', value: {loc: node.loc.end, pos: node.end}});
    }

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
    let separatorIsNewline = separator.length === 1 && (separator[0].type === 'newline' || separator[0].type === tt.newline);
    let node, i;

    if (opts.indent) { this.indent(); }

    let after = separatorIsNewline ? () => {
      if (opts.iterator) { opts.iterator(node, i); }
      if (opts.separator && i < len - 1) {
        this.newline();
      }
    } : () => {
      if (opts.iterator) { opts.iterator(node, i); }
      if (opts.separator && i < len - 1) {
        this.push(...separator);
      }
    };

    let printOpts = {
      statement: opts.statement,
      after: after
    }

    for (i = 0; i < len; i++) {
      node = nodes[i];
      if (node) {
        this._simplePrint(node, parent, printOpts);
      } else {
        // preserve holes, especially in arrays
        this.push("pass");
        after();
      }
    }

    if (opts.indent) { this.dedent(); }
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

      if (opts.indent) { this.indent(); }

      let argNode, i, len = node.length;
      let after = () => {
        if (opts.iterator) { opts.iterator(argNode, i); }
        if (opts.separator && i < len - 1) {
          // TODO: reenable this special case
          // if (!this.isLastType(tt.newline)) {
            this.push(",");
          // }
        }
      };

      let printOpts = {
        statement: opts.statement,
        after: after
      }

      for (i = 0; i < len; i++) {
        argNode = node[i];
        if (argNode) {
          this._simplePrint(argNode, parent, printOpts);
        } else {
          // preserve holes, especially in arrays
          this.push("pass");
          after();
        }
      }

      if (opts.indent) { this.dedent(); }
      this.push(")");
    }
  }

  // for array and object literals
  // TODO: move to generators/taco/types
  printLiteralBody(parent, prop, opts = {}) {
    let node = parent[prop];
    if (this.format.preserve && parent.tokenElements && parent.tokenElements.length) {
      throw new Error('Not Implemented');
    } else {
      let useNewlines = true;
      if (parent.type === "ArrayExpression" && node.length <= 5) { useNewlines = false; }
      if (parent.type === "ArrayPattern") { useNewlines = false; }
      // if ((parent.type === "ObjectExpression" || parent.type === "ObjectPattern") && node.length <= 2) { useNewlines = false; }
      if ((parent.type === "ObjectExpression") && node.length === 0) { useNewlines = false; }
      if (t.isObjectPattern(parent) && node.length <= 2) { useNewlines = false; }
      // TODO: implement the following line:
      //   if (parent.type === "ObjectPattern" && traversal.inLoopHead(parent)) { useNewlines = false; }
      // TODO: always use newlines if the literal contains a function
      opts.separator = useNewlines ? {type: "newline"} : ",";
      opts.indent = useNewlines;
      if (useNewlines) { this.newline(); }
      this._simplePrintMultiple(node, parent, opts);
      if (useNewlines) { this.newline(); }
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
      this.newline();
      this._startPrint(parent, prop, opts);
      this.printStatements(node, 'directives', opts);
      this.printStatements(node, 'body', opts);
      this._finishPrint(node, opts);
      this.dedent();
    // } else if (t.isEmptyStatement(node)) {
    //   // probably not needed
    //   this.push({type: 'pass', after: [';', '\n']}, parent, prop, opts);
    } else {
      // This is a single statement with no surrounding braces
      let noThen = t.isIfStatement(parent) && prop === 'alternate';
      noThen = noThen || t.isDoWhileStatement(parent) && prop === 'body'
      if (!noThen) this.push('then');
      this.print(parent, prop);
    }
  }
}

import _printer from "./_printer";
Object.assign(TacoscriptPrinter.prototype, _printer);

import * as baseGenerators from "./generators/taco/base";
import * as classesGenerators from "./generators/taco/classes";
import * as expressionsGenerators from "./generators/taco/expressions";
import * as literalsGenerators from "./generators/taco/literals";
import * as methodsGenerators from "./generators/taco/methods";
import * as modulesGenerators from "./generators/taco/modules";
import * as statementsGenerators from "./generators/taco/statements";
import * as templateLiteralsGenerators from "./generators/taco/template-literals";
for (let generator of [
      baseGenerators,
      classesGenerators,
      expressionsGenerators,
      literalsGenerators,
      methodsGenerators,
      modulesGenerators,
      statementsGenerators,
      templateLiteralsGenerators,
    ]) {
  Object.assign(TacoscriptPrinter.prototype, generator);
}
