import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

import some from 'lodash/some';

export function ExpressionStatement(path: NodePath, node: Node) {
  const t = [];
  const expressionPath = path.get('expression');
  this.print(path, 'expression');
  let parens = 0;
  const before = expressionPath.srcElBefore();
  for (const el of before) if (el.element === 'Punctuator' && el.value === '(') parens++;
  t.push(...before);
  t.push(expressionPath.srcEl());
  // TODO: count / match parens and place semicolon after
  const after = expressionPath.srcElAfter();
  if (parens > 0) {
    for (const el of after) {
      t.push(el);
      if (el.element === 'Punctuator' && el.value === ')') {
        parens--;
        if (parens === 0) {
          t.push({element: 'Punctuator', value: ';'});
        }
      }
    }
  } else {
    t.push({element: 'Punctuator', value: ';'});
    t.push(...after);
  }
  node[this.key] = t;
}

export function AssignmentExpression(path: NodePath, node: Node) {
  this.print(path, 'left');
  this.print(path, 'right');
  node[this.key] = [...node[this.tKey]];
}

export function BinaryExpression(path: NodePath, node: Node) {
  const t = [];
  const left = path.get('left');
  const right = path.get('right');
  t.push(...left.srcElBefore());

  this.print(path, 'left');
  t.push(left.srcEl());

  t.push(...left.srcElUntil('operator'));
  t.push({reference: 'operator', element: 'Punctuator', value: node.operator});
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

export function ConditionalExpression(path: NodePath, node: Node) {
  const t = [];
  const test = path.get('test');
  const conq = path.get('consequent');
  const alt = path.get('alternate');

  let beforeIf = true;
  let ignore = false;
  for (const el of test.srcElBefore()) {
    if (beforeIf) {
      if (el.element === 'Keyword' && el.value === 'if') {
        beforeIf = false;
        ignore = true;
        continue;
      }
    }
    if (ignore) {
      if (el.element === 'Punctuator' && el.value === '!') continue;
      // TODO: if there's more than one whitespace after `if`, wrap in parens
      // ignore whitespace before !. warn if there is.
      if (el.element === 'WhiteSpace' && el.value !== '\n') {
        ignore = false;
        continue;
      }
    }
    t.push(el);
  }

  t.push(test.srcEl());
  this.print(path, 'test');

  for (const el of test.srcElUntil(conq)) {
    if (el.element === 'Keyword' && el.value === 'then') {
      t.push({element: 'Punctuator', value: '?'});
    } else {
      t.push(el);
    }
  }

  t.push(conq.srcEl());
  this.print(path, 'consequent');

  for (const el of conq.srcElUntil(alt)) {
    if (el.element === 'Keyword' && el.value === 'else') {
      t.push({element: 'Punctuator', value: ':'});
    } else {
      t.push(el);
    }
  }

  t.push(alt.srcEl());
  this.print(path, 'alternate');

  t.push(...alt.srcElAfter());
  node[this.key] = t;
}

export {BinaryExpression as LogicalExpression};

export function MemberExpression(path: NodePath, node: Node) {
  this.print(path, 'object');
  this.print(path, 'property');
  node[this.key] = [...node[this.tKey]];
}

export {CallExpression as NewExpression};

export function UpdateExpression(path: NodePath, node: Node) {
  node[this.key] = [...node[this.tKey]];
  this.print(path, 'argument');
}
