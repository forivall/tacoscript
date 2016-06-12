import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

export function Identifier(path: NodePath, node: Node) {
  const namePath = path.get('name');
  // transforms \$get to get

  node[this.key] = [
    ...this.before(namePath),
    // TODO: tnrasform raw value to presere escape characters inside name
    {reference: 'name', value: node.name, element: 'IdentifierName'},
    ...this.after(namePath)
  ];
}

export function NumericLiteral(path: NodePath, node: Node) {
  // TODO: transform non-standard numeric literals, if we have any
  node[this.key] = [...node[this.tKey]];
}
