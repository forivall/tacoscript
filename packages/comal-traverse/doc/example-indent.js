
require('source-map-support').install()

const ast = require('./fixtures/source-elements/nested-block-directive.ast.json');
const NodePath = require('../lib/index').NodePath;

const root = NodePath.get({parent: ast, container: ast, key: 'program'})
.setContext({opts: {noScope: true, sourceElementsSource: 'sourceElements'}});

// const target = root.get('body.0.body.body.0.consequent.body.0', true);
const target = root.get('body.0.body.body.0.body', true);

// let p = target;
// while (p = p.parentPath) console.log(p.context);

console.log(target.indent())
// console.log(target.parentPath.indent())
// console.log(target.indent())
