export function File(node) {
  this.print(node, 'program');
}

export function Program(node) {
  this.printStatements(node, 'directives');
  this.printStatements(node, 'body');
}

// this is "use strict"
export function Directive(node) {
  this.print(node, 'value');
  this.newline();
}

export function DirectiveLiteral(node) {
  this.push(this._stringLiteral(node.value));
}
