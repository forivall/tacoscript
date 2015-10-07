
/**
 * Print BlockStatement, collapses empty blocks, prints body.
 */

export function BlockStatement(node, parent) {
  this.push({type: 'exec'});
  if (!node.directives || !node.directives.length) {
    if (!node.body || !node.body.length) {
      return;
    } else if (node.body.length === 1) {
      return this.printStatements(node, 'body', {collapse: true});
    }
  }
  this.indent();
  this.printStatements(node, 'directives');
  this.printStatements(node, 'body');
  this.dedent();
}
