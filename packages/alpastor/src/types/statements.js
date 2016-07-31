import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

import some from 'lodash/some';

export function IfStatement(path: NodePath, node: Node) {
  const t = [];
  const test = path.get('test');
  const conq = path.get('consequent');
  t.push(...test.srcElBefore());
  t.push({element: 'Punctuator', value: '('});

  // TODO: preserve inner paren spacing

  t.push(test.srcEl());
  this.print(path, 'test');

  t.push({element: 'Punctuator', value: ')'});
  // TODO: preserve spacing after close paren
  //       if nothing to preserve, use the spacing seen `()_here_->`
  t.push(...test.srcElUntil(conq));

  t.push(conq.srcEl());
  this.print(path, 'consequent');


  node[this.key] = t;
}

export function ReturnStatement(path: NodePath, node: Node) {
  const t = [];
  const arg = path.get('argument');
  t.push(...arg.srcElBefore());

  t.push(arg.srcEl());
  this.print(path, 'argument');

  t.push({element: 'Punctuator', value: ';'});
  t.push(arg.srcElAfter());
  node[this.key] = t;
}

export function VariableDeclaration(path: NodePath, node: Node) {
  const t = [];
  // t.push(...this.beforeRef(node, 'kind'));
  const kindPath = path.get('kind');
  t.push(...kindPath.srcElBefore());

  // TODO: allow this instead
  // this.print(path, 'kind');
  t.push(kindPath.srcEl());

  this.print(path, 'declarations', {
    before: (firstPath) => {
      t.push(...firstPath.srcElSince('kind'));
    },
    each: (path) => {
      t.push({reference: 'declarations#next'});
    },
    between: (leftPath, rightPath) => {
      const origSourceElements = leftPath.srcElUntil(rightPath);
      if (!some(origSourceElements, {value: ','})) {
        t.push({element: 'Punctuator', value: ','});
      }
      t.push(...origSourceElements);
    },
    after: (lastPath) => {
      t.push({element: 'Punctuator', value: ';'});
      t.push(...lastPath.srcElAfter());
    }
  });
  node[this.key] = t;
}

export function VariableDeclarator(path: NodePath, node: Node) {
  const t = [];
  this.print(path, 'id', {
    each: (idPath) => {
      t.push(...idPath.srcElBefore());
      t.push(idPath.srcEl());
      t.push(...idPath.srcElUntil(path.node.init && 'init'));
    }
  });
  // this.print(node.id.typeAnnotation, node);
  if (path.node.init) {
    // ensure assign is the above "push"
    // this.push("=");
    this.print(path, 'init', {
      each: (initPath) => {
        t.push(initPath.srcEl());
        t.push(initPath.srcElAfter());
      }
    });
  }
  node[this.key] = t;
}
