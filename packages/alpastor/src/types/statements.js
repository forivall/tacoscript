import type Node from 'horchata/lib/parser/node';
import type {NodePath} from 'comal-traverse';

import * as ty from 'comal-types';
import some from 'lodash/some';

// TODO: make these kind of functinos composable
function keywordToPunc(els: Array<Object>, keyword = 'then', tokens = [{element: 'Punctuator', value: ')'}]) {
  const t = [];
  let beforeParen = true;
  let beforeParenSpace = true;
  for (const el of els) {
    if (beforeParen) {
      if (beforeParenSpace && el.element === 'WhiteSpace') {
        beforeParenSpace = false;
        if (el.value !== ' ') {
          t.push({element: 'WhiteSpace', value: el.value.slice(0, -1)})
        }
      } else if (el.element === 'Keyword' && el.value === keyword) {
        beforeParen = false;
        t.push(...tokens);
      } else {
        t.push(el);
      }
    } else {
      t.push(el);
    }
  }
  if (beforeParen) {
    t.push(...tokens);
  }
  return t;
}

export function DebuggerStatement(path: NodePath, node: Node) {
  node[this.key] = [...node[this.tKey]];
  node[this.key].push({element: 'Punctuator', value: ';'});
}

export function DoWhileStatement(path: NodePath, node: Node) {
  const t = [];
  const body = path.get('body');
  const test = path.get('test');

  // TODO: preserve inner paren spacing

  t.push(...body.srcElBefore(), body.srcEl());
  this.print(path, 'body');
  // TODO: preserve spacing after close paren
  //       if nothing to preserve, use the spacing seen `()_here_->`

  t.push(...body.srcElUntil(test));

  t.push({element: 'Punctuator', value: '('});
  t.push(test.srcEl());
  this.print(path, 'test');
  t.push({element: 'Punctuator', value: ')'});
  t.push({element: 'LineTerminator', value: '\n'});

  node[this.key] = t;
}


export function EmptyStatement(path: NodePath, node: Node) {
  const t = [];
  let beforePass = true;
  let beforePassSpace = true;
  for (const el of node[this.tKey]) {
    if (beforePass) {
      if (beforePassSpace && el.element === 'WhiteSpace') {
        beforePassSpace = false;
        if (el.value !== ' ') {
          t.push({element: 'WhiteSpace', value: el.value.slice(0, -1)})
        }
      } else if (el.element === 'Keyword' && el.value === 'pass') {
        beforePass = false;
        t.push({element: 'Punctuator', value: ';'});
      } else {
        t.push(el);
      }
    } else {
      t.push(el);
    }
  }
  if (beforePass) {
    t.push({element: 'Punctuator', value: ';'});
  }
  node[this.key] = t;
}

export function IfStatement(path: NodePath, node: Node) {
  const t = [];
  const test = path.get('test');
  const conq = path.get('consequent');
  t.push(...test.srcElBefore());
  t.push({element: 'Punctuator', value: '('});

  // TODO: preserve inner paren spacing

  t.push(test.srcEl());
  this.print(path, 'test');

  // TODO: move this to a reusable spot, use whenever `then` could occur
  if (ty.isBlock(node.consequent)) {
    // TODO: preserve spacing after close paren
    //       if nothing to preserve, use the spacing seen `()_here_->`
    t.push({element: 'Punctuator', value: ')'});
    t.push(...test.srcElUntil(conq));
  } else {
    t.push(...keywordToPunc(test.srcElUntil(conq)));
  }

  t.push(conq.srcEl());
  this.print(path, 'consequent');

  if (node.alternate) {
    const alt = path.get('alternate');
    t.push(...conq.srcElUntil(alt), alt.srcEl())
    this.print(path, 'alternate');
    t.push(...alt.srcElAfter());
  } else {
    t.push(...conq.srcElAfter());
  }

  node[this.key] = t;
}

function buildLabelStatement(type, key = 'label') {
  const builder = function (path: NodePath, node: Node) {
    const t = [];
    if (node[key]) {
      const arg = path.get(key);
      t.push(...arg.srcElBefore());

      t.push(arg.srcEl());
      this.print(path, key);

      t.push({element: 'Punctuator', value: ';'});
      t.push(arg.srcElAfter());
    } else {
      t.push(...node[this.tKey])
      t.push({element: 'Punctuator', value: ';'});
    }
    node[this.key] = t;
  }
  Object.defineProperty(builder, 'name', {
    value: type
  });
  return builder;
}

export const BreakStatement = buildLabelStatement('BreakStatement');
export const ContinueStatement = buildLabelStatement('ContinueStatement');
export const ReturnStatement = buildLabelStatement('ReturnStatement', 'argument');
export const ThrowStatement = buildLabelStatement('ThrowStatement', 'argument');

export function ForStatement(path: NodePath, node: Node) {
  const t = [];
  const init = node.init ? path.get('init') : null;
  const test = node.test ? path.get('test') : null;
  const update = node.update ? path.get('update') : null;
  const body = path.get('body');

  let beforeOpenParen = true;

  if (init) {
    t.push(...init.srcElBefore());
    if (beforeOpenParen) {
      t.push({element: 'Punctuator', value: '('});
      beforeOpenParen = false;
    }
    t.push(init.srcEl());

    this.inForStatementInitCounter++;
    this.print(path, 'init');
    this.inForStatementInitCounter--;
  }

  if (test) {
    // filter out "while"
    const puncs = [{element: 'Punctuator', value: ';'}];
    if (beforeOpenParen) {
      puncs.unshift({element: 'Punctuator', value: '('});
      beforeOpenParen = false;
    }
    t.push(...keywordToPunc(test.srcElSince(init), 'while', puncs));

    t.push(test.srcEl());
    this.print(path, 'test');
  } else if (!beforeOpenParen) {
    t.push({element: 'Punctuator', value: ';'});
  }


  if (update) {
    // filter out "update"
    const puncs = [{element: 'Punctuator', value: ';'}];
    if (beforeOpenParen) {
      puncs.unshift(
        {element: 'Punctuator', value: '('},
        {element: 'Punctuator', value: ';'}
      );
      beforeOpenParen = false;
    }
    t.push(...keywordToPunc(update.srcElSince(test || init), 'update', puncs));

    t.push(update.srcEl());
    this.print(path, 'update');
  } else if (!beforeOpenParen) {
    t.push({element: 'Punctuator', value: ';'});
  }

  let rest;
  if (beforeOpenParen) {
    rest = [];
    let beforeFor = true;
    for (const el of body.srcElBefore()) {
      if (beforeFor) {
        t.push(el);
        if (el.element === 'Keyword' && el.value === 'for') beforeFor = false;
      } else {
        rest.push(el);
      }
    }
    t.push({element: 'Punctuator', value: '('});
    t.push({element: 'Punctuator', value: ';'});
    t.push({element: 'Punctuator', value: ';'});
  } else {
    rest = body.srcElSince(update || test || init);
  }
  if (ty.isBlock(node.body)) {
    t.push(...rest);
    t.push({element: 'Punctuator', value: ')'});
  } else {
    t.push(...keywordToPunc(rest));
  }

  t.push(body.srcEl());
  this.print(path, 'body');

  t.push(...body.srcElAfter());
  node[this.key] = t;
}

export function ForInStatement(path: NodePath, node: Node) {
  const t = [];
  const l = path.get('left');
  const r = path.get('right');
  const body = path.get('body');
  t.push(...l.srcElBefore());
  t.push({element: 'Punctuator', value: '('})
  t.push(l.srcEl());
  this.print(path, 'left');
  t.push(...l.srcElUntil(r));
  t.push(r.srcEl());
  this.print(path, 'right');
  if (ty.isBlock(node.body)) {
    t.push({element: 'Punctuator', value: ')'})
    t.push(...r.srcElUntil(body));
  } else {
    t.push(...keywordToPunc(r.srcElUntil(body)));
  }
  t.push(body.srcEl());
  this.print(path, 'body');
  t.push(...body.srcElAfter())
  node[this.key] = t;
}
export {ForInStatement as ForOfStatement};

export function LabeledStatement(path: NodePath, node: Node) {
  this.print(path, 'label');
  this.print(path, 'body');
  node[this.key] = [...node[this.tKey]];
}

export function SwitchStatement(path: NodePath, node: Node) {
  const t = [];
  const disc = path.get('discriminant');
  t.push(...disc.srcElBefore()
    .filter((el) => !(el.element === 'Punctuator' && el.value === '!'))
  );
  t.push({element: 'Punctuator', value: '('});
  t.push(disc.srcEl());
  this.print(path, 'discriminant');
  t.push({element: 'Punctuator', value: ')'});

  this.print(path, 'cases', {
    before: (firstPath) => {
      t.push(...this._printBlockLeading(firstPath.srcElSince(disc)));
    },
    each(path) { t.push(path.srcEl()); },
    between(leftPath, rightPath) {
      t.push(...leftPath.srcElUntil(rightPath));
    },
    after: (lastPath) => {
      t.push(...this._printBlockTrailing(path, lastPath.srcElAfter()))
    },
    empty() {
      t.push({element: 'Punctuator', value: '{'});
      t.push({element: 'Punctuator', value: '}'});
    }
  });
  node[this.key] = t;
}

export function SwitchCase(path: NodePath, node: Node) {
  const t = node[this.key] = [];

  const test = node.test ? path.get('test') : null;
  // const firstConq = node.consequent.length > 0 ? path.get('consequent.0') : null;

  if (node.test) {
    t.push(...test.srcElBefore());
    this.print(path, 'test');
    t.push(test.srcEl());
    t.push({element: 'Punctuator', value: ':'});
    t.push(...test.srcElAfter());
  } else {
    let beforeDefault = true;
    for (const el of node[this.tKey]) {
      t.push(el);
      if (beforeDefault && el.element === 'Keyword' && el.value === 'default') {
        t.push({element: 'Punctuator', value: ':'});
        beforeDefault = false;
      }
    }
  }
  this.print(path, 'consequent');
}

export function TryStatement(path: NodePath, node: Node) {
  const t = [];
  const block = path.get('block');
  const handler = node.handler ? path.get('handler') : null;
  const finalizer = node.finalizer ? path.get('finalizer') : null;
  t.push(...block.srcElBefore());

  // TODO: IIRC, `then` can occur here. make sure to filter it

  t.push(block.srcEl());
  this.print(path, 'block');
  t.push(...block.srcElUntil(handler || finalizer));

  if (handler) {
    t.push(handler.srcEl());
    this.print(path, 'handler');
    t.push(...handler.srcElUntil(finalizer));
  }

  if (finalizer) {
    t.push(finalizer.srcEl());
    this.print(path, 'finalizer');
    t.push(...finalizer.srcElAfter());
  }

  node[this.key] = t;
}

export function CatchClause(path: NodePath, node: Node) {
  const t = [];
  const param = path.get('param');
  const body = path.get('body');
  t.push(...param.srcElBefore());

  // TODO: preserve inner paren spacing

  t.push({element: 'Punctuator', value: '('});
  t.push(param.srcEl());
  this.print(path, 'param');
  t.push({element: 'Punctuator', value: ')'});


  t.push(...keywordToPunc(param.srcElAfter(), 'then', []));
  this.print(path, 'body');
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
      t.push(path.srcEl());
    },
    between: (leftPath, rightPath) => {
      const origSourceElements = leftPath.srcElUntil(rightPath);
      if (!some(origSourceElements, {value: ','})) {
        t.push({element: 'Punctuator', value: ','});
      }
      t.push(...origSourceElements);
    },
    after: (lastPath) => {
      if (!ty.isFor(path.parent)) {
        t.push({element: 'Punctuator', value: ';'});
      }
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

export function WithStatement(path: NodePath, node: Node) {
  const t = [];
  const object = path.get('object');
  const body = path.get('body');
  t.push(...object.srcElBefore().filter((el) => !(el.element === 'Punctuator' && el.value === '!')));
  t.push({element: 'Punctuator', value: '('});

  // TODO: preserve inner paren spacing

  t.push(object.srcEl());
  this.print(path, 'object');

  // TODO: preserve spacing after close paren
  //       if nothing to preserve, copy the spacing seen `()_here_->`
  if (ty.isBlock(node.body)) {
    t.push({element: 'Punctuator', value: ')'});
    t.push(...object.srcElUntil(body));
  } else {
    t.push(...keywordToPunc(object.srcElUntil(body)))
  }

  t.push(body.srcEl());
  this.print(path, 'body');

  node[this.key] = t;
}

export function WhileStatement(path: NodePath, node: Node) {
  const t = [];
  const test = path.get('test');
  const body = path.get('body');
  t.push(...test.srcElBefore());
  t.push({element: 'Punctuator', value: '('});

  // TODO: preserve inner paren spacing

  t.push(test.srcEl());
  this.print(path, 'test');

  // TODO: preserve spacing after close paren
  //       if nothing to preserve, use the spacing seen `()_here_->`
  if (ty.isBlock(node.body)) {
    t.push({element: 'Punctuator', value: ')'});
    t.push(...test.srcElUntil(body));
  } else {
    t.push(...keywordToPunc(test.srcElUntil(body)))
  }

  t.push(body.srcEl());
  this.print(path, 'body');

  node[this.key] = t;
}
