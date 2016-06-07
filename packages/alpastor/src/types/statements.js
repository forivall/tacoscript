import type Node from 'horchata/lib/parser/node';
import {NodePath} from 'comal-traverse';

export function VariableDeclaration(path: NodePath, parent: Node) {
  const t = [];
  // t.push(...this.beforeRef(parent, 'kind'));
  t.push(...this.before(NodePath.get({parentPath: path, parent, container: parent, key: 'kind'})));

  this.print(path, 'declarations', {
    before(firstPath) {
      // t.push(...this.between('kind', firstPath));

    },
    each(path) {
      t.push({reference: 'declarations#next'});
    },
    between(leftPath, rightPath) {

    },
    after(lastPath) {

    }
  });
  parent[this.key] = t;
}
