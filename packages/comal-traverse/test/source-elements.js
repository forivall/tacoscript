require('source-map-support').install()

const expect = require('chai').expect

const NodePath = require('../lib/index').NodePath;

const memberExpressionAst = require('./fixtures/source-elements/member-expression.ast.json')
const nestedBlock = require('./fixtures/source-elements/nested-block.ast.json')

const incrementFixture = require('fs').readFileSync(require('path').join(
  __dirname, '../../../specs/core/base-edgecase/misc/increment/expected.taco'
), 'utf8');

const completeDescriptorFixture = require('fs').readFileSync(require('path').join(
  __dirname, '../../../specs/core/base-literals/object-descriptor/complete/expected.taco'
), 'utf8');

const horchata = require('../../horchata');

suite('comal-traverse/source-elements', function () {
  test('NodePath#srcElUntil', function () {
    const child = memberExpressionAst.expression;
    const ctx = {opts: {sourceElementsSource: 'sourceElements'}};
    const parentPath = NodePath.get({parent: memberExpressionAst, container: memberExpressionAst, key: 'expression'}).setContext(ctx);
    const left = NodePath.get({parentPath: parentPath, parent: child, container: child, key: 'object'}).setContext(ctx);
    const right = NodePath.get({parentPath: parentPath, parent: child, container: child, key: 'property'}).setContext(ctx);
    expect(left.srcElUntil(right)).deep.equals([child.sourceElements[1]])
  })

  test('NodePath#srcElBefore', function () {
    const child = memberExpressionAst.expression;
    const ctx = {opts: {sourceElementsSource: 'sourceElements'}};
    const right = NodePath.get({parent: child, container: child, key: 'property'}).setContext(ctx);
    expect(right.srcElBefore()).deep.equals([child.sourceElements[0], child.sourceElements[1]])
  })

  test('NodePath#srcElAfter', function () {
    const child = memberExpressionAst;
    const ctx = {opts: {sourceElementsSource: 'sourceElements'}};
    const parentPath = new NodePath({}, null).setContext(ctx);
    parentPath.node = child;
    const left = NodePath.get({parent: child, parentPath: parentPath, container: child, key: 'expression'}).setContext(ctx);
    expect(left.srcElAfter()).deep.equals([child.sourceElements[1]])
  })

  test('NodePath#indent', function () {
    const root = NodePath.get({parent: nestedBlock, container: nestedBlock, key: 'program'})
    .setContext({opts: {noScope: true, sourceElementsSource: 'sourceElements'}});
    const target = root.get('body.0.body.body.0.consequent.body.0', true);
    expect(target.type).equals('ReturnStatement');
    const indent = target.indent();
    expect(indent.length).equals(1);
    expect(indent[0].value).equals('    ');
  })

  test('indent regression', function () {
    const ast = horchata.parse(incrementFixture);
    const root = NodePath.get({parent: ast, container: ast, key: 'program'})
    .setContext({opts: {noScope: true, sourceElementsSource: 'sourceElements'}});
    const target = root.get('body.0.declarations.0.init.body', true);
    expect(target.indent().length).equals(0);
  })

  test('indent wierd', function () {
    const ast = horchata.parse(completeDescriptorFixture);
    const root = NodePath.get({parent: ast, container: ast, key: 'program'})
    .setContext({opts: {noScope: true, sourceElementsSource: 'sourceElements'}});
    const target = root.get('body.0.expression.right.properties.1', true);
    const indent = target.indent();
    expect(indent.length).equals(1);
    expect(indent[0].value).equals('  ');
  })
})
