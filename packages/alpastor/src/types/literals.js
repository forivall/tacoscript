import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

import {needsParens} from '../path';
import cloneDeep from 'lodash/cloneDeep';
import some from 'lodash/some';

function last(a) { return a[a.length - 1]; }

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
      const el = path.srcEl();
      if (el.element === 'Keyword' && el.value === 'pass') {
        t.push({reference: el.reference, element: 'ArrayHole', value: ''});
      } else {
        t.push(el);
      }
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

export function ObjectExpression(path: NodePath, node: Node) {
  const t = [];
  const addParens = needsParens(path);
  if (addParens) t.push({element: 'Punctuator', value: '('})
  this.print(path, 'properties', {
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
        // if there was no comma, it means that there had to have been a newline
        // but this newline might have been included inside of a function before
        // the dedent.
        // TODO: move the newline back to after the dedent.
        if (!some(orig, {value: '\n'})) {
          t.push({element: 'WhiteSpace', value: '\n'});
        }
      }
      t.push(...orig);
    },
    after: (lastPath) => {
      let needsNewline = false;
      node[this.key] = t;
      let hasNewline = (lastPath.lastSrcEl((el) => el.element !== 'EOF' && el.value !== '', this.key) || {}).el.value === '\n';
      for (const el of lastPath.srcElAfter()) {
        if (el.element === 'Dedent') {
          needsNewline = true;
        } else if (el.value === '\n') {
          hasNewline = true;
          t.push(el);
        } else if (el.value === '}') {
          if (needsNewline && !hasNewline) t.push({element: 'LineTerminator', value: '\n'});
          t.push(el);
        }
      }
    },
    empty: () => {
      t.push(...node[this.tKey])
    }
  });
  if (addParens) t.push({element: 'Punctuator', value: ')'})

  node[this.key] = t;
}

export {ObjectExpression as ObjectPattern};

export function ObjectMethod(path: NodePath, node: Object) {
  const t = [];

  // TODO: decorators
  t.push(...this._method(path, node));

  if ((last(node.body[this.key]) || {}).element === 'LineTerminator') {
    this._pendingFunctionExpressionNewline = node.body[this.key].pop();
  }

  node[this.key] = t;
}

export function ObjectProperty(path: NodePath, node: Object) {
  const t = [];
  // TODO: decorators
  const key = path.get('key');
  const value = path.get('value');
  t.push(...key.srcElBefore(), key.srcEl());
  this.print(path, 'key');
  t.push(...key.srcElUntil(value), value.srcEl())
  this.print(path, 'value');
  t.push(...value.srcElAfter());
  // TODO: assignment pattern magic, shorthand magic:
  // ensure we use the correct srcEl
  node[this.key] = t;
}

function Literal(path: NodePath, node: Node) {
  // TODO: transform non-standard numeric literals, if we have any
  node[this.key] = [...node[this.tKey]];
}

export function RestElement(path: NodePath, node: Object) {
  node[this.key] = [...node[this.tKey]];
  this.print(path, 'argument');
}

export {
  RestElement as SpreadElement,
  RestElement as SpreadProperty,
  RestElement as RestProperty,
};

// TODO: transform differences in string literals
export {Literal as BooleanLiteral};
export {Literal as NumericLiteral};
export {Literal as NullLiteral};
export {Literal as RegExpLiteral};
export {Literal as StringLiteral};

export function ThisExpression(path: NodePath, node: Object) {
  node[this.key] = [...node[this.tKey]];
}
