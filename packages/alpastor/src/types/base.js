// TODO: pass third argument which is "original tokens" array

export function File(path, node) {
  this.print(path, 'program');
  node[this.key] = [{reference: 'program'}];
}

export function Program(path, node) {
  // TODO: turn assignment on to t into a method,
  // automatically do reference assignment instead of relying on visitors
  const t = []
  this.print(path, 'body', {
    each(path) {
      t.push({reference: 'body#next'})
    }
  })
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
