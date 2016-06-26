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

export function ArrayExpression(path: NodePath, node: Node) {
  const t = [];
  this.print(path, 'elements', {
    before(firstPath) {
      t.push(...firstPath.srcElBefore());
    },
    each(path) {
      t.push(path.srcEl());
    },
    between: (leftPath, rightPath) => {
      const orig = leftPath.srcElUntil(rightPath);
      if (!this.includes(orig, ',')) {
        t.push({element: 'Punctuator', value: ','});
      }
      t.push(...orig);
    },
    after(lastPath) {
      t.push(...lastPath.srcElAfter());
    },
    empty: () => {
      t.push(...node[this.tKey])
    }
  });

  node[this.key] = t;
}
export {ArrayExpression as ArrayPattern};

export function NumericLiteral(path: NodePath, node: Node) {
  // TODO: transform non-standard numeric literals, if we have any
  node[this.key] = [...node[this.tKey]];
}
