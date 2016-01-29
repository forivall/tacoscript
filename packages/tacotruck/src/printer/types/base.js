
export function File(node) {
  this.print(node, 'program');
}

export function Program(node) {
  this.printInnerComments(node, false);
  this.printStatements(node, 'directives');
  this.printStatements(node, 'body');
}

// this is "use strict"
export function Directive(node) {
  this.print(node, 'value');
  this.newline();
}

export function DirectiveLiteral(node) {
  // TODO: create adaptor for this
  let raw = node.extra && node.extra.raw || node.raw;
  this.push({type: "string", value: {value: node.value, raw: raw, code: raw}});
}

/**
 * Print BlockStatement, collapses empty blocks, prints body.
 */

export function BlockStatement(node) {
  this.push("!");
  this.newline();
  this.printInnerComments(node);
  if (!node.directives || !node.directives.length) {
    if (!node.body || !node.body.length) {
      return;
    }
  }
  this.indent();
  this.printStatements(node, 'directives');
  this.printStatements(node, 'body');
  this.dedent();
}
