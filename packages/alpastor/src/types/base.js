// TODO: pass third argument which is "original tokens" array

export function File(path, node) {
  this.print(path, 'program');
  node[this.key] = [
    ...this.beforeRef(node, 'program'),
    {reference: 'program'},
    ...this.afterRef(node, 'program')
  ];
}

export function Program(path, node) {
  // TODO: turn assignment on to t into a method,
  // automatically do reference assignment instead of relying on visitors
  const t = [];
  this.print(path, 'body', {
    before: (firstPath) => {
      t.push(...this.before(firstPath));
    },
    each: (path) => {
      t.push({reference: 'body#next'});
    },
    between: (leftPath, rightPath) => {
      t.push(...this.between(leftPath, rightPath));
    },
    after: (lastPath) => {
      t.push(...this.after(lastPath));
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
      const beforeElements = this.before(firstPath);
      // console.log(beforeElements)
      let beforeOpen = true;
      for (const element of (beforeElements: Array)) {
        if (beforeOpen) {
          // console.log(element);
          if (element.element === 'Punctuator' && element.value === '!') {
            t.push({element: 'Punctuator', value: '{'});
            beforeOpen = false;
          } else {
            t.push(element);
          }
        } else {
          t.push(element);
        }
      }
    },
    each: (path) => {
      t.push({reference: 'body#next'});
    },
    between: (leftPath, rightPath) => {
      t.push(...this.between(leftPath, rightPath));
    },
    after: (lastPath) => {
      const afterElements = this.after(lastPath);
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
    }
  });
  node[this.key] = t;
}
