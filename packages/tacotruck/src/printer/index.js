
// prints an ast, as tacoscript, preserves newlines if the option is set

import isArray from "lodash/isArray";
import assign from "lodash/assign";
import * as t from "babel-types";
import repeating from "repeating";

import TokenBuffer from "./buffer";
import {willCatchUpBetween, isEmpty} from "./helpers";
import {startLocOf} from "tacoscript-cst-utils";

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

function mergedPlugins(plugins: Array) {
  let merged = {};
  for (let plugin of plugins) {
    if (typeof plugin === "function") {
      plugin = plugin(tt);
    }
    merged = assign(merged, plugin);
  }
  return merged;
}

export default class Printer extends TokenBuffer {
  constructor(ast, opts, code) {
    super(opts, code);
    this.ast = ast;
    this.code = code;
    this.alt = this.opts.plugins != null ? mergedPlugins(this.opts.plugins) : {};
    this._printedCommentStarts = {};
  }

  generate() {
    this.tokenize();
    let code = this.stringify();

    return {
      code: code,
      tokens: this.tokens,
      map: this.getMap()
    }
  }

  tokenize() {
    let ast = this.ast;
    // prints the ast down into the buffer
    this._print(ast, null, {});
    this._finishPrint(ast, null, {});
  }

  print(parent, prop, opts = {}) {
    this._print(parent[prop], parent, opts);
  }

  _print(node, parent, opts) {
    this._startPrint(node, parent, opts);
    if (this[node.type]) {
      this[node.type](node, parent, opts);
    } else if (this.alt[node.type]) {
      this.alt[node.type].call(this, node, parent, opts);
    } else {
      throw new Error(`Cannot print node of type ${node.type}`);
    }
    this._finishPrint(node, parent, opts);
  }

  startPrint(parent, prop, opts) {
    return this._startPrint(parent[prop], parent, opts);
  }

  _startPrint(node, parent, opts) {
    this.printLeadingComments(node, parent);

    if (this.format.preserveLines) this.catchUp(node, parent);

    if (opts.before) opts.before();

    // push mapping start pseudo-token
    if (this.opts.sourceMaps) {
      this.push({type: 'mappingMark', value: {loc: node.loc.start, pos: node.start}});
    }
    if (isParenthesized(node) && !canOmitParens(node, parent)) this.push("(");
  }

  _finishPrint(node, parent, opts) {
    if (isParenthesized(node) && !canOmitParens(node, parent)) this.push(")");
    // push mapping end pseudo-token
    if (this.opts.sourceMaps) {
      this.push({type: 'mappingMark', value: {loc: node.loc.end, pos: node.end}});
    }

    if (opts.after) { opts.after(); }

    this.printTrailingComments(node);

    this.flush();
  }

  printMultiple(parent, prop, opts = {}) {
    let nodes = parent[prop];
    if (!nodes || !nodes.length) {
      return;
    }
    this._printMultiple(nodes, parent, opts);
  }

  _printMultiple(nodes, parent, opts) {
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
        this._print(node, parent, printOpts);
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
        this._print(argNode, parent, printOpts);
      } else {
        // preserve holes, especially in arrays
        this.push("pass");
        after();
      }
    }

    if (opts.indent) this.dedent();
    this.push(")");
  }

  // for array and object literals
  // TODO: move to generators/taco/types
  printLiteralBody(parent, prop, opts = {}) {
    const nodes = parent[prop];

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
    this._printMultiple(nodes, parent, opts);
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
        this.startPrint(parent, prop, opts);
        this.push(';;')
        this._finishPrint(node, parent, opts);
      } else {
        this.indent();
        this.newline();
        this.startPrint(parent, prop, opts);
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

  catchUp(node, parent) {
    if (node._noCatchUp) return;
    const lines = this._prevCatchUp == null ? startLocOf(node).line
      : parent === this._prevCatchUp ? startLocOf(node).line - startLocOf(parent).line
      : startLocOf(node).line - this._prevCatchUp.loc.end.line;
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

  getMap() {
    let map = this.map;
    return map ? map.toJSON() : map;
  }

  // Comments printing methods. "borrowed" from babel-generator

  getComments(key, node) {
    return (node && node[key]) || [];
  }

  printComments(comments) {
    if (!comments || !comments.length) return;

    for (let comment of (comments: Array)) {
      this.printComment(comment);
    }
  }

  printInnerComments(node, indent = true) {
    if (!node.innerComments) return;
    if (indent) this.indent();
    this.printComments(node.innerComments);
    if (indent) this.dedent();
  }

  shouldPrintComment(comment) {
    return true;
    // if (this.format.shouldPrintComment) {
    //   return this.format.shouldPrintComment(comment.value);
    // } else {
    //   if (comment.value.indexOf("@license") >= 0 || comment.value.indexOf("@preserve") >= 0) {
    //     return true;
    //   } else {
    //     return this.format.comments;
    //   }
    // }
  }
}

import * as baseGenerators from "./types/base";
import * as classesGenerators from "./types/classes";
import * as expressionsGenerators from "./types/expressions";
import * as literalsGenerators from "./types/literals";
import * as methodsGenerators from "./types/methods";
import * as modulesGenerators from "./types/modules";
import * as statementsGenerators from "./types/statements";
import * as templateLiteralsGenerators from "./types/template-literals";
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
  Object.assign(Printer.prototype, generator);
}
