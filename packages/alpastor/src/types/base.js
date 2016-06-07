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
  const bodyPaths = this.print(path, 'body', {
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

export function DirectiveLiteral(path) {

}

export function BlockStatement(node) {

}
