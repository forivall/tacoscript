require('source-map-support').install()

const expect = require('chai').expect
const alpastor = require('../lib')

const visitor = new alpastor.Visitor({sourceElements: 'sourceElements'})
const NodePath = require('comal-traverse').NodePath;

const memberExpressionAst = require('./fixtures/visitor/between/member-expression.ast.json')

suite('alpastor', function () {
  test('Visitor#between', function () {
    const child = memberExpressionAst.expression;
    const left = NodePath.get({parent: child, container: child, key: 'object'})
    const right = NodePath.get({parent: child, container: child, key: 'property'})
    expect(visitor.between(left, right)).deep.equals([child.sourceElements[1]])
  })
})
