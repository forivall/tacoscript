import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

import some from 'lodash/some';
import matches from 'lodash/matches';

const commaSrcEl = matches({element: 'Punctuator', value: ','});

export function FunctionDeclaration(path: NodePath, node: Node) {
  const t = [];
  if (node.async) {
    t.push(
      {element: 'Keyword', value: 'async'},
      {element: 'Whitespace', value: ' '}
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
    t.push(idPath.srcEl())
    this.print(path, 'id');
  } else {
    // whatever the code standard is, since this whitespace isn't rep'd in taco
  }

  const bodyPath = path.get('body');

  // TODO: typeParameters and
  // TODO: fix when length is zero
  this.print(path, 'params', {
    before: (firstPath) => {
      t.push(...firstPath.srcElSince(node.id ? 'id' : null));
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
      const afterParams = lastPath.srcElUntil(bodyPath);
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
      const idPath = path.get('id');// TODO: if
      const afterId = idPath.srcElUntil(bodyPath);
      for (const sourceElement of afterId) {
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

  this.print(path, 'body');
  t.push(bodyPath.srcEl());
  t.push(...bodyPath.srcElAfter());

  node[this.key] = t;
}
