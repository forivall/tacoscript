import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

export function ExpressionStatement(path: NodePath, node: Node) {
  const t = [];
  const expressionPath = path.get('expression');
  this.print(path, 'expression');
  t.push(...expressionPath.srcElBefore());
  t.push(expressionPath.srcEl);
  t.push({element: 'Punctuator', value: ';'});
  t.push(expressionPath.srcElAfter());
  node[this.key] = t;
}

export function CallExpression(path: NodePath, node: Node) {
  const t = [];

  const calleePath = path.get('callee');
  t.push(...calleePath.srcElBefore());
  this.print(path, 'callee');
  t.push(calleePath.srcEl());

  this.print(path, 'arguments', {
    before(firstPath) {
      if (node.extra.callType === 'excl') {
        // TODO
      } else {
        t.push(...calleePath.srcElUntil(firstPath));
      }
    },
    each(path) {
      t.push(path.srcEl());
    },
    between: (leftPath, rightPath) => {
      const origSourceElements = left.srcElUntil(rightPath);
      if (!this.includes(origSourceElements, ',')) {
        t.push({element: 'Punctuator', value: ','});
      }
      t.push(...origSourceElements);
    },
    after(lastPath) {
      t.push(lastPath.srcElAfter());
    }
  });

  node[this.key] = t;
}
