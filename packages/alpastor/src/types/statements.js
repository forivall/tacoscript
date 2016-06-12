import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

export function VariableDeclaration(path: NodePath, node: Node) {
  const t = [];
  // t.push(...this.beforeRef(node, 'kind'));
  t.push(...this.before(path.get('kind')));

  // this.print(path, 'kind');
  t.push(this.get(path, 'kind'));

  this.print(path, 'declarations', {
    before: (firstPath) => {
      t.push(...this.between('kind', firstPath));
    },
    each: (path) => {
      t.push({reference: 'declarations#next'});
    },
    between: (leftPath, rightPath) => {
      const origSourceElements = this.between(leftPath, rightPath);
      if (!this.includes(origSourceElements, ',')) {
        t.push({element: 'Punctuator', value: ','});
      }
      t.push(...origSourceElements);
    },
    after: (lastPath) => {
      t.push({element: 'Punctuator', value: ';'});
      t.push(...this.after(lastPath));
    }
  });
  node[this.key] = t;
}

export function VariableDeclarator(path: NodePath, node: Node) {
  const t = [];
  this.print(path, 'id', {
    each: (idPath) => {
      t.push(...this.before(idPath));
      t.push({reference: 'id'});
      t.push(...this.between(idPath, path.node.init && path.get('init')));
    }
  });
  // this.print(node.id.typeAnnotation, node);
  if (path.node.init) {
    // ensure assign is the above "push"
    // this.push("=");
    this.print(path, 'init', {
      each: (initPath) => {
        t.push({reference: 'init'});
        t.push(...this.after(initPath));
      }
    });
  }
  node[this.key] = t;
}
