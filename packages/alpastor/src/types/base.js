// TODO: pass third argument which is "original tokens" array

export function File(path, node) {
  this.print(path, 'program');
  node[this.key] = [...node[this.tKey]];
  // const programPath = path.get('program');
  // node[this.key] = [
  //   ...programPath.srcElBefore(),
  //   ...programPath.srcEl(),
  //   ...programPath.srcElAfter()
  // ];
}

export function Program(path, node) {
  // TODO: turn assignment on to t into a method,
  // automatically do reference assignment instead of relying on visitors
  const t = [];
  this.print(path, 'body', {
    before: (firstPath) => {
      t.push(...firstPath.srcElBefore());
    },
    each: (path) => {
      t.push(path.srcEl());
    },
    between: (leftPath, rightPath) => {
      t.push(...leftPath.srcElUntil(rightPath));
    },
    after: (lastPath) => {
      t.push(...lastPath.srcElAfter());
    }
  });
  node[this.key] = t;
}

export function Directive(path, node) {
  const valuePath = path.get('value');
  this.print(path, 'value');
  const trailing = valuePath.srcElAfter();
  const t = [
    ...valuePath.srcElBefore(),
    valuePath.srcEl(),
  ];
  const mappedTrailing = [];
  let beforeLineTerminator = true;
  for (const el of trailing) {
    if (beforeLineTerminator && el.element === 'LineTerminator') {
      beforeLineTerminator = false;
      mappedTrailing.push({element: 'Punctuator', value: ';'});
      if (el.value !== '') {
        mappedTrailing.push(el);
      }
    } else {
      mappedTrailing.push(el);
    }
  }
  if (beforeLineTerminator) {
    t.push({element: 'Punctuator', value: ';'});
  }
  t.push(...mappedTrailing);
  node[this.key] = t;
}

export function DirectiveLiteral(path, node) {
  node[this.key] = [...node[this.tKey]];
}

function printBlockLeading(leadingElements) {
  const t = [];
  let beforeExcl = true;
  let beforeOpen = true;
  for (const element of (leadingElements: Array)) {
    if (element.element === 'Punctuator' && element.value === '!') {
      beforeExcl = false;
    } else if (element.element === 'Indent') {
      beforeOpen = false;
      t.push({element: 'Punctuator', value: '{'});
    } else {
      t.push(element);
    }
  }
  if (beforeExcl && beforeOpen) {
    t.push({element: 'Punctuator', value: '{'});
  }
  return t;
}

function printBlockTrailing(trailingElements) {
  const t = [];
  let beforeNewline = true;
  let beforeCloseCurly = true;
  for (const element of (trailingElements: Array)) {
    if (beforeNewline) {
      if (element.element === 'LineTerminator') {
        if (element.value === '') {
          t.push({element: 'LineTerminator', value: '\n'});
          beforeNewline = false;
        } else if (beforeCloseCurly && element.value === '\n') {
          t.push(element);
          t.push({element: 'Punctuator', value: '}'});
          beforeCloseCurly = false;
        } else {
          t.push(element);
        }
      } else {
        t.push(element);
      }
    } else {
      t.push(element);
    }
  }
  if (beforeNewline) {
    t.push({element: 'LineTerminator', value: '\n'});
  }
  if (beforeCloseCurly) {
    t.push({element: 'Punctuator', value: '}'});
    t.push({element: 'LineTerminator', value: '\n'});
  }
  return t;
}

export function BlockStatement(path, node) {
  const t = [];

  // TODO: read formatting markers and omit newlines where applicable
  let lastDirectivePath;
  if (node.directives && node.directives.length) {
    this.print(path, 'directives', {
      before(firstPath) {
        const leadingElements = firstPath.srcElBefore();
        t.push(...printBlockLeading(leadingElements));
      },
      each(path) { t.push(path.srcEl()); },
      between(leftPath, rightPath) {
        t.push(...leftPath.srcElUntil(rightPath));
      },
      after(lastPath) {
        lastDirectivePath = lastPath;
      }
    });
  }

  this.print(path, 'body', {
    before: (firstPath) => {
      const leadingElements = firstPath.srcElSince(lastDirectivePath);
      if (node.directives && node.directives.length) {
        t.push(...leadingElements);
      } else {
        t.push(...printBlockLeading(leadingElements));
      }
    },
    each: (path) => {
      t.push(path.srcEl());
    },
    between: (leftPath, rightPath) => {
      t.push(...leftPath.srcElUntil(rightPath));
    },
    after: (lastPath) => {
      // TODO: put close curly where dedent is instead
      const trailingElements = lastPath.srcElAfter(lastPath);
      t.push(...printBlockTrailing(trailingElements));
    },
    empty: () => {
      if (!lastDirectivePath) {
        t.push({element: 'Punctuator', value: '{'});
      }
      // ... // TODO: strip out indent/dedents
      if (lastDirectivePath) {
        t.push(...printBlockTrailing(lastDirectivePath.srcElAfter()));
      } else {
        t.push({element: 'Punctuator', value: '}'});
        t.push(...node[this.tKey]);
      }
    }
  });

  node[this.key] = t;
}
