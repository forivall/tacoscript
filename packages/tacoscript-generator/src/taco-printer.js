
// simple prints will print an ast, without regard for cst tokens
// preserved print will print an ast, while trying to preserve whitespace
// and other formatting included in cst tokens

import isArray from "lodash/lang/isArray";
import * as t from "babel-types";
import repeating from "repeating";

import TacoscriptTokenBuffer from "./taco-buffer";
import {tokTypes as tt, tokComments} from "horchata";
const
  blockCommentJs = tokComments.blockCommentMeta['/*'],
  blockCommentTaco = tokComments.blockCommentMeta['#*'];

function isParenthesized(node) {
  return node.extra != null && node.extra.parenthesized || node.parenthesizedExpression;
}

function canOmitParens(node, parent) {
  return (
    t.isObjectExpression(node) ||
    t.isFunctionExpression(node) && node.id === null && t.isExportDefaultDeclaration(parent) ||
  false);
}

export default class TacoscriptPrinter extends TacoscriptTokenBuffer {
  constructor(ast, opts, code) {
    super(opts, code);
    this.ast = ast;
    this.code = code;
    this._printedCommentStarts = {};
  }

  tokenize() {
    let ast = this.ast;
    // prints the ast down into the buffer
    this._simplePrint(ast, null, {});
    this._finishPrint(ast, null, {});
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
    this._finishSimplePrint(node, parent, opts);
  }

  _preservedPrint(parent, prop, opts) {
    let node = parent[prop];
    this._startPreservedPrint(parent, prop, opts);
    if (!this[node.type]) { throw new Error(`Cannot print node of type ${node.type}`); }
    this[node.type](node, parent, opts);
    this._finishPrint(node, parent, opts);
  }

  _startPrint(parent, prop, opts) {
    if (this.format.preserve && parent.tokenElements && parent.tokenElements.length) {
      return this._startPreservedPrint(parent, prop, opts);
    } else {
      return this._simpleStartPrint(parent[prop], parent, opts);
    }
  }

  _simpleStartPrint(node, parent, opts) {
    this.printLeadingComments(node, parent);

    if (this.format.preserveLines) this.catchUp(node, parent);

    if (opts.before) opts.before();

    // push mapping start pseudo-token
    if (this.opts.sourceMaps) {
      this.push({type: 'mappingMark', value: {loc: node.loc.start, pos: node.start}});
    }
    if (isParenthesized(node) && !canOmitParens(node, parent)) this.push("(");
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

  _finishPrint(node, parent, opts) {
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
      this._finishSimplePrint(node, parent, opts);
    }
    this.flush();
  }

  _finishSimplePrint(node, parent, opts) {
    if (isParenthesized(node) && !canOmitParens(node, parent)) this.push(")");
    // push mapping end pseudo-token
    if (this.opts.sourceMaps) {
      this.push({type: 'mappingMark', value: {loc: node.loc.end, pos: node.end}});
    }

    if (opts.after) { opts.after(); }

    this.printTrailingComments(node);
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
    const len = nodes.length;
    const separator = opts.separator
      ? isArray(opts.separator)
        ? opts.separator : [opts.separator]
      : [];
    const separatorIsNewline = separator.length === 1 && (separator[0].type === 'newline' || separator[0].type === tt.newline);
    const omitSeparatorIfNewline = this.format.preserveLines && opts.omitSeparatorIfNewline;
    let node, i;

    if (opts.indent) { this.indent(); }

    const after = separatorIsNewline ? () => {
      if (opts.iterator) opts.iterator(node, i);
      if (i < len - 1) {
        this.newline();
      }
    } : omitSeparatorIfNewline ? () => {
      if (opts.iterator) opts.iterator(node, i);
      if (i < len - 1 && !willCatchUpBetween([nodes[i], nodes[i + 1]])) {
        this.push(...separator);
      }
    } : () => {
      if (opts.iterator) opts.iterator(node, i);
      if (i < len - 1) {
        this.push(...separator);
      }
    };

    const printOpts = {
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

    if (opts.indent) this.dedent();
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

      if (opts.indent) this.indent();

      let argNode, i, len = node.length;
      let after = () => {
        if (opts.iterator) { opts.iterator(argNode, i); }
        if (opts.separator && i < len - 1) {
          // TODO: reenable this special case
          // if (!this.lastTokenIsNewline()) {
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

      if (opts.indent) this.dedent();
      this.push(")");
    }
  }

  // for array and object literals
  // TODO: move to generators/taco/types
  printLiteralBody(parent, prop, opts = {}) {
    const nodes = parent[prop];
    if (this.format.preserve && parent.tokenElements && parent.tokenElements.length) {
      throw new Error('Not Implemented');
    } else {
      const useNewlines = !(
        this.format.preserveLines ||
        parent.type === "ArrayExpression" && nodes.length <= 5 ||
        parent.type === "ArrayPattern" ||
        (parent.type === "ObjectExpression") && nodes.length === 0 ||
        t.isObjectPattern(parent) && nodes.length <= 2 ||
      false)
      // TODO: implement the following line:
      //   if (parent.type === "ObjectPattern" && traversal.inLoopHead(parent)) useNewlines = false;
      // TODO: always use newlines if the literal contains a function
      opts.separator = useNewlines ? {type: "newline"} : ",";

      opts.indent = useNewlines || this.format.preserveLines && willCatchUpBetween(nodes, parent);
      opts.omitSeparatorIfNewline = true;
      if (useNewlines) this.newline();
      this.printInnerComments(parent);
      this._simplePrintMultiple(nodes, parent, opts);
      if (useNewlines) this.newline();
      else if (this.format.preserveLines) {
        let lastChild;
        for (let i = nodes.length - 1; i >= 0; i--) if ((lastChild = nodes[i]) != null) break;
        if (lastChild) {
          this._catchUp(parent.loc.end.line - lastChild.loc.end.line, parent);
          this._prevCatchUp = parent;
        }
      }
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
      if (t.isDoWhileStatement(parent) && isEmpty(node.directives) && isEmpty(node.body)) {
        this._startPrint(parent, prop, opts);
        this.push(';;')
        this._finishPrint(node, parent, opts);
      } else {
        this.indent();
        this.newline();
        this._startPrint(parent, prop, opts);
        this.printStatements(node, 'directives', opts);
        this.printStatements(node, 'body', opts);
        this._finishPrint(node, parent, opts);
        this.dedent();
      }
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

  printComment(comment, node) {
    if (!this.shouldPrintComment(comment)) return;

    if (this.format.preserveLines) this.catchUp(comment, node);

    if (comment.ignore) return;
    comment.ignore = true;

    if (comment.start != null) {
      if (this._printedCommentStarts[comment.start]) return;
      this._printedCommentStarts[comment.start] = true;
    }

    if (comment.type === "CommentBlock") {
      this._push({type: tt.blockCommentStart, value: {kind: "#*", code: "#*"}});
      // TODO: encode/decode comment value for output in javascript
      let commentBody = comment.value;
      commentBody = commentBody.replace(blockCommentJs.terminatorEscapeSubRe, blockCommentJs.terminatorSub);
      commentBody = commentBody.replace(blockCommentTaco.terminatorSubRe, blockCommentTaco.terminatorEscapeSub);

      this._push({type: tt.blockCommentBody, value: {kind: "#*", code: commentBody, value: comment.value}});
      this._push({type: tt.blockCommentEnd, value: {kind: "#*", code: "*#"}});
    } else {
      let commentKind; switch (comment.end - comment.start - comment.value.length) {
        case 3: commentKind = "-->"; break;
        case 4: commentKind = "<!--"; break;
        default: commentKind = "#"
      }
      let commentBody = comment.value;
      if (commentKind === "#" && /^ *\*/.test(commentBody[0])) {
        commentBody = " " + commentBody;
      }
      this._push({type: tt.lineCommentStart, value: {kind: commentKind, code: commentKind}});
      this._push({type: tt.lineCommentBody, value: {kind: commentKind, code: commentBody, value: comment.value}});
      this.newline();
    }
  }


  printLeadingComments(node) {
    const comments = this.getComments("leadingComments", node);

    this.printComments(comments, node);

    // TOOD: convert to a "catchup" style newline printing
    // print newlines after leading comments
    const lastComment = comments[comments.length - 1];

    if (lastComment && lastComment.type === "CommentBlock" && node.loc.start.line > lastComment.loc.end.line) {
      this.newline();
    }
  }

  printTrailingComments(node) {
    const comments = this.getComments("trailingComments", node);
    this.printComments(comments);
  }

  _startLocOf(node) {
    // maybe class expressions too.
    // TODO: get this to work
    if (node.type === "ClassMethod" || node.type === "ObjectMethod"/* || node.type === "ClassDeclaration"*/) {
      if (node.decorators != null && node.decorators.length > 0) {
        return node.decorators[0].loc.start;
      }
    }
    return node.loc.start;
  }

  catchUp(node, parent) {
    if (node._noCatchUp) return;
    const lines = this._prevCatchUp == null ? this._startLocOf(node).line
      : parent === this._prevCatchUp ? this._startLocOf(node).line - this._startLocOf(parent).line
      : this._startLocOf(node).line - this._prevCatchUp.loc.end.line;
    // TODO: store a different prevCatchUp for comments
    this._prevCatchUp = node;
    return this._catchUp(lines, parent);
  }

  _catchUp(newlines, parent) {
    if (newlines <= 0) return 0;
    if (
          // TODO: this will become unnecessary with future parsing udpates -- should remove
          parent && parent.type === "SequenceExpression" ||
        false) {
      // TODO: check other contexts
      // TODO: preserve indentation for escaped newlines
      this.push({type: tt.whitespace, value: {code: repeating("\\\n", newlines)}})
    } else {
      let first = true;
      for (let i = newlines; i > 0; i--) {
        this.newline(!first);
        first = false;
      }
    }
    return newlines;
  }
}

export function willCatchUpBetween(nodes, parent) {
  let prevNode = nodes[0], first = true;
  for (let i = 1, len = nodes.length, nextNode;
      nextNode = nodes[i], i < len; i++) {
    if (prevNode && first) {
      first = false;
      if (parent && willCatchUpLeading(parent, prevNode)) return true;
    }
    if (nextNode) {
      if (prevNode != null && prevNode.loc.end.line < nextNode.loc.start.line) return true;
      prevNode = nextNode
    }
  }
  if (parent && willCatchUpTrailing(parent, prevNode)) return true;
  return false;
}

export function willCatchUpLeading(node, firstChild) {
  if (firstChild == null) return false;
  return node.loc.start.line < firstChild.loc.start.line;
}
export function willCatchUpTrailing(node, lastChild) {
  if (lastChild == null) return false;
  return lastChild.loc.end.line < node.loc.end.line;
}

export function isEmpty(nodes) {
  return nodes == null || nodes.length === 0;
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
