import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

import {needsParens} from '../path';
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

export function AssignmentPattern(path: NodePath, node: Node) {
  // TODO: for loop headers: instanceof, in
  this.print(path, 'left');
  this.print(path, 'right');
  node[this.key] = [...node[this.tKey]];
}

export function AssignmentExpression(path: NodePath, node: Node) {
  const t = [];
  // Somewhere inside a for statement `init` node but doesn't usually
  // needs a paren except for `in` expressions: `for (a in b ? a : b;;)`
  const parens = this.inForStatementInitCounter && node.operator === 'in' &&
               !needsParens(path);

  if (parens) {
    t.push({element: 'Punctuator', value: '('});
  }

  const l = path.get('left');
  const r = path.get('right');
  t.push(...l.srcElBefore(), l.srcEl());
  this.print(path, 'left');

  // TODO: translate assignment operators
  t.push(...l.srcElUntil(r));

  t.push(r.srcEl());
  this.print(path, 'right');
  t.push(...r.srcElAfter());

  if (parens) {
    t.push({element: 'Punctuator', value: ')'});
  }
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

export function SequenceExpression(path: NodePath, node: Node) {
  const t = [];
  this.print(path, 'expressions', {
    before(first: NodePath) {
      t.push(...first.srcElBefore());
    },
    each(expr: NodePath) {
      t.push(expr.srcEl());
    },
    between(left: NodePath, right: NodePath) {
      const u = [];
      // TODO: see if wrapping parenthises are needed; add if they are.

      // TODO: remove this, since sequence always needs delimiter
      // but this logic is needed for function args, arrays, objects
      let seenDelimiter = false;
      for (const el of left.srcElUntil(right)) {
        if (el.element === 'Punctuator' && el.value === ';') {
          seenDelimiter = true;
          u.push({element: 'Punctuator', value: ','});
        } else {
          u.push(el);
        }
      }
      if (!seenDelimiter) {
        t.push({element: 'Punctuator', value: ','});
      }
      t.push(...u);
    },
    after(last: NodePath) {
      t.push(...last.srcElAfter());
    },
    empty() {
      throw new Error('sequence expressions cant be empty');
    }
  });
  node[this.key] = t;
}

export function UnaryExpression(path: NodePath, node: Node) {
  const t = [];
  const op = path.get('operator');
  const arg = path.get('argument');
  // TODO: remove one space of whitespace after `not`
  t.push(...op.srcElBefore());
  const opEl = op.srcEl();
  if (opEl.value === 'not') {
    t.push({element: 'Punctuator', reference: 'operator', value: '!'});
    let trimmed = false;
    const els = op.srcElUntil(arg);
    const el = els[0];
    if (el.element === 'WhiteSpace' && el.value.charCodeAt(0) === 32) {
      if (el.value.length > 1) {
        arg.push({element: 'WhiteSpace', value: el.value.slice(1)});
      }
    } else {
      arg.push(el);
    }
    t.push(arg.srcEl(), ...arg.srcElAfter());
  } else {
    t.push(opEl);
    t.push(...op.srcElAfter());
  }
  this.print(path, 'argument');
  // t.push(...op.srcElUntil(arg), arg.srcEl(), ...arg.srcElAfter());
  node[this.key] = t;
}

export function UpdateExpression(path: NodePath, node: Node) {
  node[this.key] = [...node[this.tKey]];
  this.print(path, 'argument');
}
