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
  this.print(path, 'value');
  this.transformToLineTerminator(this.after('value'))
}

// export function DirectiveLiteral(path) {
//
// }

export function BlockStatement(path, node) {
  const t = [];

  // TODO: read formatting markers and omit newlines where applicable

  this.print(path, 'body', {
    before: (firstPath) => {
      const beforeElements = firstPath.srcElBefore();
      // console.log(beforeElements)
      let beforeExcl = true;
      let beforeOpen = true;
      for (const element of (beforeElements: Array)) {
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
    },
    each: (path) => {
      t.push(path.srcEl());
    },
    between: (leftPath, rightPath) => {
      t.push(...leftPath.srcElUntil(rightPath));
    },
    after: (lastPath) => {
      // TODO: put close curly where dedent is instead
      const afterElements = lastPath.srcElAfter(lastPath);
      let beforeNewline = true;
      let beforeCloseCurly = true;
      for (const element of (afterElements: Array)) {
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
    },
    empty: () => {
      t.push(
        {element: 'Punctuator', value: '{'},
        // TODO: inner comments
        {element: 'Punctuator', value: '}'},
        // ... // TODO: strip out indent/dedents
        ...node[this.tKey]
      );
    }
  });

  node[this.key] = t;
}
