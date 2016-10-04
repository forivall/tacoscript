// TODO: document acronym ACST = abstract/concrete syntax tree =
// ast with cst elements

import {render} from 'tacoscript-cst-utils';
import {WalkContext} from 'comal-traverse';
import type {NodePath} from 'comal-traverse';
import type {Node} from 'horchata/lib/parser/node';
import find from 'lodash/find';

export function generate(acst, opts) {
  opts = opts || {};

  const sourceElementsKey = opts.sourceElements = opts.sourceElements || 'sourceElements';
  if (!opts.tacoscriptSourceElements) opts.tacoscriptSourceElements = 'tacoscriptSourceElements';
  opts.sourceElementsSource = opts.tacoscriptSourceElements;

  const printer = new PrinterContext(null, opts, new PrinterState());
  printer.visitRoot(acst, opts);

  return {
    code: render(acst, sourceElementsKey),
    ast: acst
  };
}

function lastRenderable(t) {
  let offset = 1;
  for (let l = t.length, offset = 1; offset <= l; offset++) {
    const element = t[t.length - offset];
    if (element.element !== 'EOF' && element.value !== '') return element;
  }
}

class PrinterState {
  constructor() {
    this.inForStatementInitCounter = 0;
    this.lastElement = null;
    this.sourceLastElement = null;
  }
}

class PrinterContext extends WalkContext {
  constructor(parentPath, opts, state) {
    super(parentPath, {...state.opts, ...opts});
    this.state = state;
    this.tKey = opts.tacoscriptSourceElements;
    this.key = opts.sourceElements;
  }

  /**
   * usage:
    this.print(path, 'program', {
      before: (first) => {
        console.log('before', first)
      },
      between: (left, right) => {
        console.log(left, right)
      },
      after: (last) => {
        console.log('last', last);
      }
    })
   */

  print(path, prop, interns) {
    let child = new PrinterContext(path, {...this.opts, interns}, this.state);
    child.visit(path.node, prop);
  }

  visitPath(path) {
    const node = path.node;
    if (node) {
      if (!this[node.type]) {
        throw new Error('Cannot print node of type "' + node.type + '"')
      }
      this[node.type](path, node);
      this.updateLastRenderable(node);
    }
  }

  lastElement(t) {
    const lastElement = t[t.length - 1];
    return lastElement && lastElement.element ? lastElement : this.state.lastElement;
  }

  updateLastRenderable(node) {
    if (!node[this.key]) return;

    const lastElement = lastRenderable(node[this.key]);
    if (lastElement && lastElement.element) this.state.lastElement = lastElement;

    const sourceLastElement = lastRenderable(node[this.tKey]);
    if (sourceLastElement && sourceLastElement.element) {
      this.state.sourceLastElement = sourceLastElement;
    }
  }
}

import * as baseGenerators from "./types/base";
// import * as classesGenerators from "./types/classes";
import * as expressionsGenerators from "./types/expressions";
import * as literalsGenerators from "./types/literals";
import * as methodsGenerators from "./types/methods";
// import * as modulesGenerators from "./types/modules";
import * as statementsGenerators from "./types/statements";
// import * as templateLiteralsGenerators from "./types/template-literals";
for (const generator of [
      baseGenerators,
      // classesGenerators,
      expressionsGenerators,
      literalsGenerators,
      methodsGenerators,
      // modulesGenerators,
      statementsGenerators,
      // templateLiteralsGenerators,
    ]) {
  Object.assign(PrinterContext.prototype, generator);
}
