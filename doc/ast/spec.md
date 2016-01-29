These are additions to the [core Babylon AST node types](https://github.com/babel/babel/blob/master/doc/ast/spec.md)

- [Node objects](#node-objects)
- [Statements](#statements)
  - [ImplicitReturnBlockStatement](#implicitreturnblockstatement)
- [Declarations](#declarations)
  - [ArrowFunctionDeclaration](#arrowfunctiondeclaration)
  - [VariableDeclaration](#variabledeclaration)
- [Expressions](#expressions)
  - [NamedArrowFunctionExpression](#namedarrowfunctionexpression)
  - [ObjectExpression](#objectexpression)
    - [ObjectMember](#objectmember)
      - [ObjectArrowMethod](#objectarrowmethod)
  - [ThisMemberExpression](#thismemberexpression)
  - [Binary operations](#binary-operations)
    - [AssignmentExpression](#assignmentexpression)
      - [AssignmentOperator](#assignmentoperator)
  - [N-ary operations](#n-ary-operations)
    - [RelationalExpression](#relationalexpression)
  - [CallExpression](#callexpression)
- [Classes](#classes)
  - [ClassArrowMethod](#classarrowmethod)


# Node objects

# Statements

## ImplicitReturnBlockStatement

Enabled by `implicitReturnFunctions` horchata feature

inherits `BlockStatement`

Produced by "sharp arrows": `->>`

Gets transformed into a BlockStatement, where statements in tail call position are transformed into return statements.

# Declarations

## ArrowFunctionDeclaration

Enabled by `lexicallyBoundNamedFunctions` horchata feature

Performs the same lexical binding that an ArrowFunctionExpression would, but as a declaration.

inherits `FunctionDeclaration`

## VariableDeclaration

`kind`: `"extern"` added by `externDeclarations` horchata feature



# Expressions

## NamedArrowFunctionExpression

Enabled by `lexicallyBoundNamedFunctions` horchata feature

Performs the same lexical binding that an ArrowFunctionExpression would, but as a named function expression.

inherits `FunctionExpression`

## ObjectExpression

### ObjectMember

#### ObjectArrowMethod

Enabled by `lexicallyBoundNamedFunctions` horchata feature

Performs the same lexical binding that an ArrowFunctionExpression would, but as a declaration.

inherits `ObjectMethod`

## ThisMemberExpression

Enabled by `strudelThisMember` horchata feature

```js
interface ThisMemberExpression <: Expression, Pattern {
  type: "ThisMemberExpression";
  property: Expression;
}
```

Shorthand for `this.`, that is, a `MemberExpression` where the object is always a `ThisExpression`.

## Binary operations

### AssignmentExpression

#### AssignmentOperator

```js
enum AssignmentOperator { [AssignmentOperator] |
  "||=" | "&&"=
}
```

These two new operators added by `tacoscript-logical-assign`.

## N-ary operations

### RelationalExpression

Added by `tacoscript-fluid-comparison`

```js
interface RelationalExpression <: Expression {
  type: "RelationalExpression";
  operator: BinaryOperator;
  elements: [ Expression ];
}
```

## CallExpression

- also includes `parenLess: true | false`

# Classes

## ClassArrowMethod

Enabled by `lexicallyBoundNamedFunctions` horchata feature

Performs the same lexical binding that an ArrowFunctionExpression would, but as a declaration.

inherits `ClassMethod`
