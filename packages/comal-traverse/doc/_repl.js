const completeDescriptorFixture = require('fs').readFileSync(
  '../../specs/core/base-literals/object-descriptor/complete/expected.taco'
, 'utf8');

const NodePath = require('./lib/index').NodePath;
const horchata = require('../horchata');

const ast = horchata.parse(completeDescriptorFixture);
const root = NodePath.get({parent: ast, container: ast, key: 'program'})
.setContext({opts: {noScope: true, sourceElementsSource: 'sourceElements'}});

const util = require('util')
/*
console.log(util.inspect(
  root.get('body.0.expression.right.properties.1', true).indent(),
  {colors: true}
))
*/
