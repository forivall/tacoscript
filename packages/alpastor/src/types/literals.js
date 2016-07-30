import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

import cloneDeep from 'lodash/cloneDeep';
import some from 'lodash/some';

export function Identifier(path: NodePath, node: Node) {
  const namePath = path.get('name');
  // transforms \$get to get

  const srcEl = cloneDeep(namePath.srcEl());
  srcEl.value = srcEl.value.replace(/^\\\$/, '');
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
      if (!some(orig, {value: ','})) {
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

// TODO: transform differences in string literals
export {NumericLiteral as StringLiteral};
