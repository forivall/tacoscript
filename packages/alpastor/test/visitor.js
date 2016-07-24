require('source-map-support').install()

const expect = require('chai').expect
const alpastor = require('../lib')

const visitor = new alpastor.Visitor({tacoscriptSourceElements: 'sourceElements'})
const NodePath = require('comal-traverse').NodePath;

suite('alpastor', function () {
})
