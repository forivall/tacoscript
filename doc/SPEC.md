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

  In general, `!` is used similar to how CSS uses it for `!important`. See more uses below.

2. Braces are only used for object literals, and are always required for object literals

3. Use natural language for logical operators and control flow. Stick with using symbols for mathematic and boolean operators. Keywords that take arguments don't need parens.
  * `&&` ↔ `and`
  * `||` ↔ `or`
  * `!` ↔ `not`

  * `===` ↔ `is`
  * `!==` ↔ `isnt`
  * `==` ↔ `like`
  * `!=` ↔ `unlike`
    * could be changed to `similarto` and `not similarto`. _Feedback requested_
    * Use of is, isnt, like and unlike will also be completely optional, but one should be consistent in their use, and all customization will be lost in a decompile cycle.

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
  function foo(bar) ~>
  var foo = (bar) ~>
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

8. `pass` is used for empty statements, but is not required for empty blocks (unlike Python).

9. Use `then` for if/for/etc. bodys that are a single statement
  `if (true) console.log(yay);` ↔ `if true then console.log(yay)`
  * `then` can be omitted if the statement starts on the same line with a keyword. This allows you to write flatter nesting
    `if (err) return err;` ↔ `if err return err`
    `if (false) for (;;);` ↔ `if false for then pass`

10. `#` is used for line comments. `#**#` is a block comment.
  * This might be up for discussion, some good points are made in [frappe].

## Extended syntax
All of the following syntax is optional, but is default, and is part of the core tacoscript "experience". It's implemented as custom parts of the AST that is transformed into a de-sugared form.

#### Phase 1
* Automatic `let`, `extern` to assign undeclared variables. [(spec)](./auto-let.md)
* Function calls without parenthises, with the `!` operator
  * `fs.readFile! "package.json", (err, data) ->`
* IIFE syntax
  * `(function(a, b, c){})(d, e, c)` ↔ `(d as a, e as b, c)! ->`
* `@` ↔ `this.` ([frappe])
* `for var i = 0 upto 5`, `downto` -- or a different simple for loop incremental shorthand. _Feedback requested_
* extended assign - `or=`, `and=`, `?=`
* sharp non-double arrows, multiline sharp arrow functions

#### Phase 2
* `not instanceof` ([frappe])
* `not in` ([frappe])
* lower precedence of `not`, `is not` same as `isnt`
* non-fallthrough `switch` [(spec)](./safe-switch.md)
* `a < b < c` ([frappe])
* `%%` ([frappe])
* null coalsecing and soak operator (`?` and `?.` and `?[]`)
* expression version of switch statements

#### Phase 3
* array and object comprehensions
* automatic generator and async function promotion
* block regex
* Python style keyword arguments
  * should look for or create a good, standardized format for kwargs, that can be submitted as an esnext proposal.

## Implementation Plan

* [ ] Implement taco-generator to generate tacoscript (masascript) from babylon ASTs
* [ ] Implement horchata, the tacoscript (including Phase 1 and 2 syntax) parser
* [ ] Improve documentation
* [ ] Implement each of the extended syntax as independent transforms
* [ ] Fork acorn-babel and modify to parse tacoscript
  * [ ] implement off-side rule parsing
  * [ ] implement other keywords
* [ ] implement whitespace preserving js generator


### formatting directives (work in progress)
notes: special formatting directives: `#$DIRECTIVE_HERE$#`
include raw js (for empty statements): ```$`;// javascript here`#```

Since whitespace is significant, we need some way to control whitespace output for oddly formatted js

increase preceding indent: `>`  
decrease preceding indent: `<`  
replace preceding spaces: `r{\t\t}`  

so that would look like `#$<$#decreased_indent_statement()`

[frappe]: https://github.com/lydell/frappe
