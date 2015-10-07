export function File(node: Object) {
  this.print(node, 'program');
}

export function Program(node: Object) {
  this.printStatements(node, 'directives');
  this.printStatements(node, 'body');
}

// "use strict"
export function Directive(node: Object) {
  this.print(node, 'value');
  this.endLine();
}

export function DirectiveLiteral(node: Object) {
  this.push(this._stringLiteral(node.value));
}
