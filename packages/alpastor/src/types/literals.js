import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

import cloneDeep from 'lodash/cloneDeep';

export function Identifier(path: NodePath, node: Node) {
  const namePath = path.get('name');
  // transforms \$get to get

  const srcEl = cloneDeep(namePath.srcEl());
  // TODO: transform raw value to presere escape characters inside name
  node[this.key] = [
    ...namePath.srcElBefore(),
    srcEl,
    ...namePath.srcElAfter()
  ];
}

export function NumericLiteral(path: NodePath, node: Node) {
  // TODO: transform non-standard numeric literals, if we have any
  node[this.key] = [...node[this.tKey]];
}
