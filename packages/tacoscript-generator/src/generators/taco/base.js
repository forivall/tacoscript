
/**
 * Print BlockStatement, collapses empty blocks, prints body.
 */

export function BlockStatement(node, parent) {
  this.push("!");
  if (!node.directives || !node.directives.length) {
    if (!node.body || !node.body.length) {
      return;
    }
  }
  this.newline();
  this.indent();
  this.printStatements(node, 'directives');
  this.printStatements(node, 'body');
  this.dedent();
}
