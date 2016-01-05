# TacoScript

A cleaner, indentation-based alternative syntax for ES2015+. Inspired by Coffeescript (and its inspirations).

## Goals

* The AST follows the estree standard specification.
  * Tacoscript can be generated from _any_ javascript.
  * Custom features are implemented with additional AST types that are tranformed down into vanilla js. Common patterns in vanilla js then are decompiled into tacoscript syntax.
    * Untransformed tacoscript is called "masascript"
  * If the original source is available, and CST tokens are provided, whitespace will be preserved as much as possible. Eventually, code style will be detected, and the generated javascript will conform to the given code style (for style rules that are meaningless in a tacoscript context).
* Integrate with the Babel transpiler.

## Aspirations
* Create a git extension that allows switching between Taco representations just by switching branches

## Core Syntax (Masascript)
1. Blocks should use significant indentation. Standalone blocks start with a single `!`.

  ```
  {
    let foo = 1;
  }
  ```
  ↔
  ```
  !
    let foo = 1
  ```

  In ge neral, `!` is used similar to how CSS uses it for `!important`. See more uses below.

2. Braces are only used for object literals, and are always required for object literals

3. Use natural language for logical operators and control flow. Stick with using symbols for mathematic and boolean operators. Keywords that take arguments don't need parens.
  * `&&` ↔ `and`
  * `||` ↔ `or`
  * `!` ↔ `not`

  * `===` ↔ `is`
  * `!==` ↔ `isnt`
  * `==` ↔ `like`
  * `!=` ↔ `unlike`
    * the above 4 are optional, but use should be consistent

  * `for (var i = 1; i < 6; i++) {}` ↔ `for var i = 1 while i < 6 update i++`
  * `for (var x in y) {}` ↔ `for var x in y`
  * `a ? b : c` ↔ `if! a then b else c`
    * if a conditional expression is somewhere where blocks cannot occur, the `!` can be omitted
      `(a ? b : c)` ↔ `(if a then b else c)`
  * `while (true) {}` ↔ `while true`
  * &nbsp;

    ```
    do {}
    while (true) {}
    ```
    ↔
    ```
    do
    while true
    ```

4. No semicolons to end statements. A newline always ends a statement, unless escaped, or if there are open parenthises.

5. In objects, arrays and arguments, newlines can be used instead of commas. These can be mixed and matched.

6. Consistent arrow syntax
  * all functions use arrows
  * parenthises are always required
  * implicit return is only used if the arrow is a "sharp arrow" - `=>>`, `->>`

  ```
  function foo(bar) { console.log("baz"); }
  var foo = function(bar) { console.log("baz"); }
  var foo = function foo(bar) { console.log("baz"); }
  var foo = function(bar) { return console.log("baz"); }
  var foo = bar => console.log(bar);
  var foo = bar => { console.log(bar) };

  function* foo(bar) {}
  var foo = function*(bar) {}
  async function foo(bar) {}
  var foo = async function(bar) {}
  async function* foo(bar) {}
  var foo = async function*(bar) {}
  ```
  ↔
  ```
  function foo(bar) -> console.log("baz")
  var foo = (bar) -> console.log("baz")
  var foo = function foo(bar) -> console.log("baz")
  var foo = (bar) ->> console.log("baz")
  var foo = (bar) =>> console.log(bar)
  var foo = (bar) => console.log(bar)

  function foo(bar) *->
  var foo = (bar) *->
  function foo(bar) +>
  var foo = (bar) +>
  function foo(bar) *+>
  var foo = (bar) *+>
  ```

  ```
  class Foo {
    constructor() {}
    bar() {}
  }
  ```
  ↔
  ```
    class Foo
      constructor() ->
      bar() ->
  ```

7. Semicolon is used as the sequence operator
  * `var c = (a, b);` ↔ `var c = (a; b)`

8. Use `then` for if/for/etc. `body`s that are a single statement
  `if (true) console.log(yay);` ↔ `if true then console.log(yay)`
  * `then` can be omitted if the statement starts on the same line with a keyword. This allows you to write flatter nesting
    `if (err) return err;` ↔ `if err return err`

9. `pass` is used for empty statements, but is not required for empty blocks (unlike Python).
  * `[a,, b]` ↔ `[a, pass, b]`
  * `if (true);` ↔ `if true then pass`
  * `if (true) {}` ↔ `if true`

10. When decompiling, variables that would be tacoscript keywords have a leading `\$`
  `var extern = 1;` ↔ `var \$extern = 1`

  ```
  class A {
    static static() {
      return false;
    }
  }
  ```
  ↔
  ```
  class A
    static \$static() ->
      return false
  ```

11. (maybe) `#` for line comments, `#*` for block comments, `#%` for directive comments, `###` (alone on a line) for _temporarily_ commenting out blocks of code (like `#if 0` in C). `# *` for a line comment that starts with a \*.
  Pending: https://github.com/wycats/javascript-private-state
  *Note:* Possible alternatives for the slot token are `@@`, `@!` or `//`

  <code>\*\\#</code> for parts of a block comment that contains <code>\*#</code>. etc.

## Extended syntax
All of the following syntax is optional, but is default, and is part of the core tacoscript "experience". Each will be implemented as a plugin that can be optionally turned off/on

#### Phase 1
* [ ] Function calls without parenthises, with the `!` operator
  * `fs.readFile! "package.json", (err, data) ->`
  * [x] parse - TODO: store in extra
  * [ ] generate (requires inference)
* [ ] Automatic `const`, `extern` to assign undeclared (global) variables. [(spec)](./auto-const.md)
* [ ] IIFE syntax
  * [ ] `(function(a, b, c){})(d, e, c)` ↔ `(! d as a, e as b, c) ->`
* [ ] `@.` ↔ `this.` ([frappe])
* [ ] extended assign - `or=`, `and=`, `?=`
* [ ] sharp non-double arrows, multiline sharp arrow functions

#### Phase 2
* [ ] `not instanceof` ([frappe])
* [ ] `not in` ([frappe])
* [ ] `a < b < c` ([frappe])
* [ ] `%%` ([frappe])
* [ ] null coalsecing and soak operator (`?` and `?.` and `?[]`)
* [ ] simplify `!!` ↔ `not not` to `asbool` (still a prefix operator)
* [ ] lower the precedence of `not` _Feedback requested_, `is not` same as `isnt`
* [ ] `typeof a === b` -> `(a === null ? 'null' : typeof a) === b`

#### Phase 3
* [ ] non-fallthrough `switch` [(spec)](./safe-switch.md)
* [ ] boolean switch statements (a la Coffeescript)
* [ ] expression version of boolean switch statements
* [ ] label-less long break/continue -- `break for` will break from the lexically nearest for loop
* [ ] `rescue` a la Ruby or Go's `recover`
* [ ] `for var i = 0 upto 5`, `downto` + `by 2` -- or a different simple for loop incremental shorthand. _Feedback requested_
* [ ] "kinda lispy" `or` and `and` blocks -- can also be done with other operators? do they need `!` to avoid ambiguous productions?

  ```
  result =
    a ||
    b ||
    c ||
    this.isFoo() ||
  false;

  return (
    foo &&
    (bar || baz) &&
    this.makesSense() &&
  true);
  ```
  ↔
  ```
  result = or
    a
    b
    c
    this.isFoo()

  return and
    foo
    bar or baz
    this.makesSense()
  ```
* [ ] "literate" mode

#### Phase 4
* [ ] array and object comprehensions
* [ ] automatic generator and async function promotion
* [ ] block regex
* [ ] Python style keyword arguments
  * should look for or create a good, standardized format for kwargs, that can be submitted as an esnext proposal.
* [ ] Whatever custom syntax makes the parser easier to read
* [ ] allow any indentation level, but it won't be automatically closed. instead,
  statements will be closed with `endswitch`, `endif`, `endwhile` `enddo`, etc.

  This would be opt-in, or automatically enabled if the indentation of your source js sucks.

* [ ] allow breaking from blocks
  ```
  switch (0) { default:
    if (shouldBreak) {
      break;
    }
  }
  ```
  or
  ```
  do {
    if (shouldBreak) {
      break;
    }
  } while (false);
  ```
  ↔
  ```
  !
    if shouldBreak
      break
  ```

* [ ] allow variable declarations in while, if/else and switch statements
  ```
  { let result; while (result = test()) {
    // body
  }}
  ```
  ↔
  ```
  while let result = test()
    # body
  ```

  ```
  {let instance; if (instance = getInstance())._isRightType) {
    // do something
  } else {
    // something else
    // but if instance is used here, decompilation does not occur
  }}
  ```
  ↔
  ```
  if (let instance = getInstance())._isRightType
    # do something
  else
    # something else
    # but throw parsing error if instance is used here

  ```


# Phase 5
* [ ] Hygenic Macros, aka, port sweet.js
* [ ] Overloading infix operators, ``` !arith(a + b) ``` or `a +! b` to use raw operators; type inference would also be used to use raw operators when possible.


## Implementation Plan

* [x] Implement taco-generator to generate tacoscript (masascript) from babylon ASTs
  * [x] Publish tacoscript generator and make demo site
* [ ] Implement horchata, the tacoscript (including Phase 1 and 2 syntax) parser
  * [x] -Replace use of pos & loc with tokenIndex, and then read pos & loc from token-
    * [x] pass a proto-token object instead of pos and loc, which includes pos, loc and token index
  * [x] (partially done) Implement a simpler & more performant version of lookahead compared to babylon's lookahead
    * [ ] use lookahead'd tokens when the context doesn't change
  * [ ] Instead of setting and unsetting the state on `this`, pass a scope object down the recursive descent.
  * [x] Add CST-in-AST nodes
    * [x] instead of setting node properties directly, use `Parser#assign` or `set` or `add`
* [ ] Improve documentation
* [ ] Implement each of the extended syntax as independent transforms
* [ ] add whitespace and comment preservation to tacoscript-generator
* [ ] implement whitespace preserving js generator


### formatting directives (work in progress)
notes: special formatting directives: `#%DIRECTIVE_HERE%#`
include raw js (for empty statements): ```#%`;// javascript here`%#```

Since whitespace is significant, we need some way to control whitespace output for oddly formatted js

increase preceding indent: `>`
decrease preceding indent: `<`
replace preceding spaces: `r{\t\t}`

so that would look like `decreased_indent_statement()#$<$#`

TODO: determine an encoding for unexpected spacing around tokens that are redundant compared to tacoscript, for example, `function() {` vs `function () {` are both encoded to `() ->`.

[frappe]: https://github.com/lydell/frappe
