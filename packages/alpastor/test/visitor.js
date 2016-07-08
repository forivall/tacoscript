require('source-map-support').install()

const expect = require('chai').expect
const alpastor = require('../lib')

const visitor = new alpastor.Visitor({tacoscriptSourceElements: 'sourceElements'})
const NodePath = require('comal-traverse').NodePath;

const memberExpressionAst = require('./fixtures/visitor/between/member-expression.ast.json')

suite('alpastor', function () {
})
