import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

import some from 'lodash/some';
import matches from 'lodash/matches';

const commaSrcEl = matches({element: 'Punctuator', value: ','});

export function _function(path: NodePath, node: Node) {
  const t = [];
  if (node.async) {
    t.push(
      {element: 'Keyword', value: 'async'},
      {element: 'Whitespace', value: ' '} // TODO: preserve
    );
  }

  t.push({element: 'Keyword', value: 'function'});
  if (node.generator) {
    const afterStar = path.get('generator').srcElAfter();
    for (const element of afterStar) {
      // TODO: formalize cst notation of arrows
      if (element.extra.tokenType === 'arrow') break;
      // if (['->'].includes(element.value))
      t.push(element);
    }
    t.push(this.ref(node, 'generator'));
  }

  if (node.id) {
    // TODO: support lodash-like find functions for between and before and after
    // t.push(...this.between({element: 'Keyword', value: 'function'}, {reference: 'id'}));
    let before = true;
    const idPath = path.get('id');
    const beforeIdElements = idPath.srcElBefore();
    // TODO: do this when there's no id too.
    for (const sourceElement of beforeIdElements) {
      if (before) {
        if (sourceElement.element === 'Keyword' && sourceElement.value === 'function') {
          before = false;
        }
      } else {
        t.push(sourceElement);
      }
    }
    t.push(idPath.srcEl());
    this.print(path, 'id');
  } else {
    // whatever the code standard is, since this whitespace isn't rep'd in taco
  }

  const bodyPath = path.get('body');

  t.push(...this._params(path, node, 'id'));

  this.print(path, 'body');
  t.push(bodyPath.srcEl());
  t.push(...bodyPath.srcElAfter());

  return t;
}

export function _method(path: NodePath, node: Node) {
  const t = [];
  const kind = node.kind;
  const key = path.get('key');
  const body = path.get('body');

  if (kind === 'method' || kind === 'init') {
    if (node.generator) {
      const genPath = path.get('generator');
      const genSrcEl = genPath.srcEl();
      if (genSrcEl) {
        // TODO:
        // genPath.srcElUntil((el) => el.kind === 'Punctuator' && el.value === '->')
        for (const el of genPath.srcElAfter()) {
          // TODO: shorthand for arrow, cover all arrow types
          if (el.kind === 'Punctuator' && el.value === '->') break;
          t.push(el);
        }
        t.push(genSrcEl);
      }
    }
  }

  // NOTE: this handles `get` and `set`
  // TODO: verify that get or set is there
  // TODO: stop at open square brace for computed
  t.push(...key.srcElBefore());

  t.push(key.srcEl());
  this.print(path, 'key');

  if (node.async) {
    t.push({element: 'Keyword', value: 'async'});
    t.push({element: 'WhiteSpace', value: ' '}); // TODO: preserve
  }

  // if (params.length > 0) {
  //   const firstParam = path.get('params.0');
  //
  // } else {
  //
  // }
  t.push(...this._params(path, node, 'key'));

  this.print(path, 'body');
  t.push(body.srcEl());
  t.push(...body.srcElAfter());

  return t;
}

export function _params(path: NodePath, node: Node, id: string) {
  const t = [];
  const body = path.get('body');
  // TODO: typeParameters and
  // TODO: fix when length is zero
  this.print(path, 'params', {
    before: (firstPath) => {
      t.push(...firstPath.srcElSince(node[id] ? id : null));
    },
    each: (path) => {
      t.push(path.srcEl());
      // TODO: typeAnnotation, optional
    },
    between: (leftPath, rightPath) => {
      const origSourceElements = leftPath.srcElUntil(rightPath);
      if (!some(origSourceElements, commaSrcEl)) {
        t.push({element: 'Punctuator', value: ','});
      }
      t.push(...origSourceElements);
    },
    after: (lastPath) => {
      const afterParams = lastPath.srcElUntil(body);
      for (const sourceElement of afterParams) {
        if (sourceElement.element === 'Punctuator' && (
          sourceElement.value === '*' || sourceElement.extra.tokenType === 'arrow'
        )) {
          break;
        }
        t.push(sourceElement);
      }
      // TODO: returnType
      // TODO: check if there's whitespace after the arrow.
    },
    empty: () => {
      // TODO: handle method stuff: computed key
      const beforeBody = body.srcElSince(node[id] ? path.get(id) : null);
      for (const sourceElement of beforeBody) {
        if (sourceElement.element === 'Punctuator' && (
          sourceElement.value === '*' || sourceElement.extra.tokenType === 'arrow'
        )) {
          break;
        }
        t.push(sourceElement);
      }

      // TODO: check if there's whitespace after the arrow.
      // TODO: dedupe code
    }
  });
  return t;
}

export function FunctionDeclaration(path: NodePath, node: Node) {
  const t = this._function(path, node);
  const body = node.body;
  if (body.body.length > 0 || body.directives && body.directives.length > 0) {
    t.push({element: 'Newline', value: '\n'});
  }
  node[this.key] = t;
}

export function FunctionExpression(path: NodePath, node: Node) {
  node[this.key] = this._function(path, node);
}
