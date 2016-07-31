import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

import some from 'lodash/some';

export function ExpressionStatement(path: NodePath, node: Node) {
  const t = [];
  const expressionPath = path.get('expression');
  this.print(path, 'expression');
  t.push(...expressionPath.srcElBefore());
  t.push(expressionPath.srcEl());
  t.push({element: 'Punctuator', value: ';'});
  t.push(expressionPath.srcElAfter());
  node[this.key] = t;
}

export function BinaryExpression(path: NodePath, node: Node) {
  const t = [];
  const left = path.get('left');
  const right = path.get('right');
  t.push(...left.srcElBefore());

  this.print(path, 'left');
  t.push(left.srcEl());

  t.push(...left.srcElUntil('operator'));
  // TODO: translate binary expression keywords into symbols
  t.push(path.get('operator').srcEl());
  // TODO: unescape escaped newlines
  t.push(...right.srcElSince('operator'));

  this.print(path, 'right');
  t.push(right.srcEl());

  t.push(...right.srcElAfter());

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
      if (node.extra != null && node.extra.callType === 'excl') {
        // TODO
      } else {
        t.push(...calleePath.srcElUntil(firstPath));
      }
    },
    each(path) {
      t.push(path.srcEl());
    },
    between: (leftPath, rightPath) => {
      const origSourceElements = leftPath.srcElUntil(rightPath);
      if (!some(origSourceElements, {value: ','})) {
        t.push({element: 'Punctuator', value: ','});
      }
      t.push(...origSourceElements);
    },
    after(lastPath) {
      t.push(...lastPath.srcElAfter());
    },
    empty() {
      if (node.extra != null && node.extra.callType === 'excl') {
        // TODO
      } else {
        t.push(...calleePath.srcElAfter());
      }
    }
  });

  node[this.key] = t;
}

export function UpdateExpression(path: NodePath, node: Node) {
  node[this.key] = [...node[this.tKey]];
  this.print(path, 'argument');
}
