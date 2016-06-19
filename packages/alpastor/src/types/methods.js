import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

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
      if (!this.includes(origSourceElements, ',')) {
        t.push({element: 'Punctuator', value: ','});
      }
      t.push(...origSourceElements);
    },
    after: (lastPath) => {
      const afterParams = lastPath.srcElAfter();
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
    }
  });

  const bodyPath = path.get('body');

  this.print(path, 'body');
  t.push(bodyPath.srcEl());
  t.push(...bodyPath.srcElAfter());

  node[this.key] = t;
}
