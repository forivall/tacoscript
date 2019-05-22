# TacoScript

A cleaner, indentation-based alternative syntax for ES2015+. Inspired by Coffeescript (and its inspirations).

## Goals

* The AST follows babel/babylon's AST specification.
  * Tacoscript can be generated from _any_ JavaScript.
  * Custom features are implemented with additional AST types that are tranformed down into vanilla js. Common patterns in vanilla js then are transposed into tacoscript syntax, when it's possible to detect a pattern.
    * Untransformed / simple tacoscript can be called "masascript"
  * If the original source is available, and CST tokens are provided, whitespace will be preserved as much as possible. Eventually, code style will be detected, and the generated javascript will conform to the given code style (for style rules that are meaningless in a tacoscript context).
* Integrate with the Babel transpiler.
* Repurpose neglected keywords, such as `switch` and `with`.

## Aspirations
* Create a git extension that allows switching between Taco representations just by switching branches

## Terminology

* Compose - like "compile" or "transpile", turns tacoscript into vanilla (es2015+) javascript
  * can also just turn tacoscript into simple tacoscript ("masascript")
  * could also be used for turning experimental javascript into plain javascript
* Transpose - like "decompile" or "detranspile", turns javascript into tacoscript
* Compile - take the output of "compose" (es6 js) and then use babel to transpile it into es5 js

## Core Syntax

Everything not specified here, is the same as in JavaScript

1. Blocks use significant indentation. Standalone blocks start with a single `!`.

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

  `!` is used in a variety of situations, not just blocks. See below

2. Braces are only used for object literals, and are always required for object literals

3. Use natural language for logical operators and control flow. Stick with using symbols for mathematic and boolean operators. Keywords that take arguments don't need parens.
  * `&&` ↔ `and`
  * `||` ↔ `or`
  * `!` ↔ `not`

  * `===` ↔ `is`
  * `!==` ↔ `isnt`
  * `==` ↔ `like`
  * `!=` ↔ `unlike`
    * the above 4 are optional, but your use should be consistent

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

4. Improved semicolon semantics. A newline always ends a statement, unless
escaped, or if the line ends with a [`continuesExpr` token][tokens] (aka, the line ends before an expression can be completed) Unfortunately,
python behaviour of allowing newlines anywhere within parens cannot be mirrored,
since blocks can appear inside of parens, whereas in python, only expressions can
appear within parens. In statement position, semicolons act as they do in javascirpt, in expression position, they act as the comma operator. so, `const foo = 1; const bar = 2` is the same as javascript, and `(foo = 1; bar = 2)` is the comma operator (`foo = 1, bar = 2`)

5. In objects, arrays and arguments, newlines can be used instead of commas. These can be mixed.

6. Consistent arrow syntax
  * all functions use arrows
  * parentheses are always required _(for now)_
  * implicit return is only used if the arrow is a "sharp" arrow - `=>>`, `->>`

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

7. Semicolon is used as the sequence operator. Double-semicolon can be used to include two statements on one line.
  * `var c = (a, b);` ↔ `var c = a; b`
  * `var c = (a, b); if (c === b) console.log("c is b")` ↔ `var c = a; b;; if c is b then console.log! "c is b"`

8. Use `then` for if/for/etc. `body`s that are a single statement
  `if (true) console.log(yay);` ↔ `if true then console.log(yay)`
  * `then` can be omitted if the statement starts on the same line with a keyword. This allows you to write flatter nesting
    `if (err) return err;` ↔ `if err return err`

9. `pass` is used for empty statements, but is not required for empty blocks (unlike Python).
  * `[a,, b]` ↔ `[a, pass, b]`
  * `if (true);` ↔ `if true then pass`
  * `if (true) {}` ↔ `if true`

10. When transposing, variables that would be tacoscript keywords have a leading `\$`
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
  _Alternative:_ As almost all keywords take an argument, surrounding a taco keyword with parentheises should also be a possibility to switch it into identifier mode - ie. `(static)() ->> false`

11. `#` for line comments, `#*` for block comments, `#%` for directive comments, `###` (alone on a line) for _temporarily_ commenting out blocks of code (like `#if 0` in C). `# *` for a line comment that starts with a \*.

  <code>\*\\#</code> for parts of a block comment that contains <code>\*#</code>. etc.

12. `switch` with fallthroughs starts with `switch!`, and a phase 3 "[safe switch]" plugin will be written for "safe" switch statements, where each case breaks, and fallthrough is opt-in.

13. `with` will be reused for iife. The vanilla, (deprecated in strict mode anyways) `with` must be declared as `with!`

14. Python-ish import statements: As autocomplete systems can resolve the members to import once we have declared from which module we are importing members, it's more useful to declare the module name first
    ```js
    import * as fs from 'fs'
    import {resolve} from 'path'
    import FileTypePipe from 'file-type-pipe'
    import defaultImport, {FileTypePipe} from 'file-type-pipe'
    ```
    
    ```taco
    import 'fs' as fs
    from 'path' import {resolve}
    from 'file-type-pipe' import FileTypePipe
    from 'file-type-pipe import defaultImport, {FileTypePipe}
    ```

## Extended syntax
All of the following syntax is optional, but is default, and is part of the core
tacoscript "experience". Each will be implemented as a plugin that can be
optionally turned off/on. Features with links to github issues are generally in
progress.

#### Phase 1 (March 2016) - Proof of Concept / Core features
* [ ] `@` ↔ `this.` ([frappe]) [#13]
* [ ] extended assign - `or=`, `and=` [#14]
* [ ] "sharp" non-double arrows, multiline sharp arrow functions [#15]
* [ ] Function calls without parentheses, with the `!` operator [#16]
  * `fs.readFile! "package.json", (err, data) ->`
* [ ] Function calls without parentheses, without `!` operator, only when in statement position [#17]

#### Phase 1.5 -
* [ ] Automatic `const`, `extern` to assign undeclared (global) variables. [(spec)](./auto-const.md) [#18]

#### Phase 2 - A "Useful" language
* [ ] IIFE syntax [#19]
  `(function(a, b, c){})(d, e, c)` ↔ `with {a: d, b: e, c}`  
  `(function*(a, b, c){})(d, e, c)` ↔ `with* {a: d, b: e, c}`  
  `(async function(a, b, c){})(d, e, c)` ↔ `with+ {a: d, b: e, c}`  
  `((a, b, c) => {})(d, e, c)` ↔ `with= {a: d, b: e, c}`  
  `((a, b, c) => (a + b + c))(d, e, c)` ↔ `with= {a: d, b: e, c} > a + b + c`  

* [ ] `not instanceof` ([frappe])
* [ ] `not in` ([frappe])
* [ ] `a < b < c` ([frappe])
* [ ] `%%` ([frappe])
* [ ] `unless` ([frappe])
* [ ] `until` ([frappe])
* [ ] xor `a <> b` (coffeescript)
* [ ] autobinding (`=>`) of named function expressions (nfe), function declarations, methods, and generator functions
* [ ] allow omitting `!` for parenthises-less function calls when used as statements ([frappe])
  * tagged template literals will have higher precedence though
* [ ] null coalsecing and soak operator (`?` and `?.` and `?[]`)
  * [ ] null check extended assign `?=`
* [ ] simplify `!!` ↔ `not not` to `asbool` (still a prefix operator)
* [ ] add warning for `is not`, since it's not the same as `isnt`
  * recommend use of `is (not`
  * this will just be an eslint plugin
* [ ] `typeof a === b` ↔ `(a === null ? 'null' : typeof a) === b`
* [ ] `of` binary operator.
  * `contained = a of b` ↔ `contained = [...a].includes(b)`
  * `contained = a of [b, c, d]` ↔ `contained = a === b || a === c || a === d`
  * also `not of`

#### Phase 3 - A "Complete" language
* [ ] loose string parsing, unify string interpolation behaviour ([frappe])
  * tagged template strings will still require `\`\``
  * update parser to not create tagged template literals when there is whitespace between the tag and the template
* [ ] `@@` in class methods to `ClassName.`
* [ ] non-fallthrough `switch` [(spec)][safe switch]
* [ ] boolean switch statements (a la Coffeescript)
* [ ] expression version of boolean switch statements
* [ ] `rescue` a la Ruby or Go's `recover`
* [ ] `for var i = 0 upto 5`, `downto` + `by 2` -- or a different simple for loop incremental shorthand. _Feedback requested_
  * [ ] `upto=`, `downto=` for inclusive
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
* [ ] generic decorators
  * decorators can be used on any function declaration. [See also](#notes-on-the-decorators-proposal-)

#### Phase 4 - A "Modern" language
* [ ] loop enhancements (coffeescript)
  * [ ] `for key, value in object`
  * [ ] `for value, index of iterable`
  * [ ] `for own key in object`
  * [ ] `for own key, value in object`
* [ ] array and object comprehensions
* [ ] multiline regex (coffeescript / [frappe])
  * also, since we are not using `//` for comments, `/(?:)/` ↔ `//`
* [ ] Python style keyword arguments
  * should look for or create a good, standardized format for kwargs, that can be submitted as an esnext proposal.
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
    // but if instance is used here, transposition does not occur
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

#### Other long-term or non-essential ideas

* [ ] inverted destructuring, like the inverted imports, and with differing modification 
    ```js
    const {foo} = bar
    let {baz} = bar
    ```
    ↔
    ```taco
    bar =: {foo, let baz}
    ```
* [ ] label-less long break/continue -- `break for` will break from the lexically nearest for loop
* [ ] Whatever custom syntax makes the parser easier to read
* [ ] allow any indentation level, but it won't be automatically closed. instead,
statements will be closed with `endswitch`, `endif`, `endwhile` `enddo`, etc.

  This would be opt-in, or automatically enabled if the indentation of your source js sucks.

* [ ] automatic generator and async function promotion
* [ ] Hygenic Macros, aka, port sweet.js
  * [ ] Allow importing them, and allow exporting functions as macros so that postfix `!` isn't necessary (see http://2ality.com/2014/09/es6-modules-final.html)
* [ ] Overloading infix operators, ``` !arith(a + b) ``` or `a +! b` to use raw operators; type inference would also be used to use raw operators when possible.
* [ ] Array properties

      var arr = [
        1, 2, 3
        4
        a: 1
      ]

  ↔

      var \_tmp, arr = (\_tmp = [
        1, 2, 3,
        4
      ]; \_tmp.a = 1; \_tmp)

  * must come after all numbered values

* [ ] [Const classes](http://wiki.ecmascript.org/doku.php?id=harmony:classes#const)
* [ ] shorten `else if` to `elif`
* [ ] Deep object properties (especially useful for destructuring): `{a.b: 1}` ↔ `{a: {b: 1}}`
* [ ] `:=` for `Object.defineProperty`
  * `this.foo :=wce foo` ↔ `Object.defineProperty(this, 'foo', {writable: true, configurable: true, enumerable: true, value: foo})
  * `this.foo := foo` ↔ `Object.defineProperty(this, 'foo', {writable: false, configurable: false, enumerable: false, value: foo})
  * `this.foo :=+ foo` ↔ `Object.defineProperty(this, 'foo', {...Object.getOwnPropertyDescriptor(this, 'foo'), value: foo})
  * `this.foo :=-w foo` ↔ `Object.defineProperty(this, 'foo', {...Object.getOwnPropertyDescriptor(this, 'foo'), writable: false, value: foo})
  * `this.foo :=^ foo` ↔ `Object.defineProperty(this, 'foo', {...Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), 'foo'), value: foo})`
    * `^` is to get the prototype
    * also use `^*` to go up the prototype chain until a descriptor is found (would use a helper)
  * `this.foo :=ce {get() { return 'foo' }}`  ↔ `Object.defineProperty({configurable: true, enumerable: true, get() { return 'foo' }, set: undefined})`
* [ ] `::proto` for `Object.getPrototypeOf`
  * `this::proto` ↔ `Object.getPrototypeOf(this)`
* [ ] `proto` in class declarations / expressions
  * ```
    class Foo {
      proto bar = 'baz'
    }
    ```
    ↔ 
    ```
    class Foo {}
    Foo.prototype.bar = 'baz'
    ```

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


## Notes on [wycats' private state proposal]

If it does get accepted & implemented by babel, TacoScript's syntax will be
`this@privateData`, and `other@privateData` and if strudel-this-member is enabled, will be shortened to `@!privateData`. Declarations will not need `@`, i.e.
`private slot1 = 52`.

    let obj = {
      private data
      get data() ->> this@data
      set data(v) -> this@data = v
    }

## Notes on [the decorators proposal]

If `@` is used as the `this` shorthand, decorators will instead use `>` for
clarity and ease of parsing. (Since they can only appear in statements, we can
use any binary operator safely that isn't also a prefix (like `+`).)

If python had a `self.` shorthand, it would be used instead of `@`. Nor can we
follow this [ruby proof of concept of decorators]. So `>` is a decent
replacement, since it's reminiscent of shell redirection. :shrug: With the
additiion of other stage-0 proposals to use the @ character, other possible
alternatives are the diamond `<>` operator, the fat x `><` operator and the
sideways y `-<`/`>-`, or to reintroduce `||` or `&&`.


## formatting directives (work in progress)
notes: special formatting directives: `#%DIRECTIVE_HERE%#`
include raw js (for empty statements): ```#%`;// javascript here`%#```

Since whitespace is significant, we need some way to control whitespace output for oddly formatted js

increase preceding indent: `>`
decrease preceding indent: `<`
replace preceding spaces: `r{\t\t}`

so that would look like `decreased_indent_statement()#$<$#`

TODO: determine an encoding for unexpected spacing around tokens that are redundant compared to tacoscript, for example, `function() {` vs `function () {` are both encoded to `() ->`.

  * Idea: for full whitespace preservation, require utf-8 or other unicode
    encodings. Insert zero-width spaces (U+200B) and word joiners (U+2060) as a
    binary encoding of ids, and then insert a comment at the end that references
    these ids and insert the appropriate whitespace in the location. Only
    sequences of zwsp's and wj's are used, so that singular sequences can still
    be used. sequences that already exist in the code are noted in the
    file-trailing comment, so that they are ignored.

[tokens]: ../packages/horchata/src/lexer/types.js
[safe switch]: ./safe-switch.md
[frappe]: https://github.com/lydell/frappe
[wycats' private state proposal]: https://github.com/wycats/javascript-private-state
[the decorators propsal]: https://github.com/wycats/javascript-decorators
[ruby proof of concept of decorators]: https://github.com/michaelfairley/method_decorators

[#13]: https://github.com/forivall/tacoscript/issues/13
[#14]: https://github.com/forivall/tacoscript/issues/14
[#15]: https://github.com/forivall/tacoscript/issues/15
[#16]: https://github.com/forivall/tacoscript/issues/16
[#17]: https://github.com/forivall/tacoscript/issues/17
[#18]: https://github.com/forivall/tacoscript/issues/18
[#19]: https://github.com/forivall/tacoscript/issues/19
