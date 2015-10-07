# Tacoscript

ECMAScript, with added boring!

## Goals

* Have a one to one representation of the Spidermonkey Parser API AST or the babeljs AST
  * this means that tacoscript can be a simple alternate representation of vanilla es6 javascript
  * tacoscript can be generated from _any_ javascript, with standard formatting, defined in file headers or config files in the directory, or command line arguments (known as directives)
* Be fully compatible with ES6+ via babel

## Aspirations
* Be compatible with [sweet.js](http://sweetjs.org)
  * since sweetjs and babel are incompatible, this is unlikely, unless sweetjs is updated to work with babel somehow
* use git hooks + magic to allow switching between representations just by switching branches

## Design Philosophy
Don't use `!` for negation, instead, use it more as an execution marker, or kinda like how CSS uses it for `!important`.

Use words for logic, and symbols for math.

Minimal semicolons and braces. Ideally none. Allow braces for object literals, but prefer indentation for blocks.

## Implementation Plan

* [ ] Improve this documentation checking each es6 feature from an es6 spec and detailing any departures
* [ ] Fork acorn-babel and modify to parse tacoscript
  * [ ] implement off-side rule parsing
  * [ ] implement other keywords
* [ ] Fork / reimplement esgenerate to generate es6 from babel ASTs
* [ ] Implement tacogenerate to generate tacoscript from babel ASTs

## Target syntax

### Main, simple changes
js
```JavaScript
/* block comment */
// line comment
var \u1337 = {};
var foo, bar;
foo == bar;
foo == null;
foo != null;
foo === bar;
foo !== bar;
foo || bar;
foo && bar;
```
taco
```
#* block comment *#
# line comment
\\u1337 = {}
foo similarto bar
foo?
not foo?
foo is bar
foo isnt bar
foo or bar
foo and bar
```
js
```JavaScript
foo ? bar : baz;
foo ? bar
: fizz ? bizz
: baz;
```
taco
```
toggle foo on bar off baz
toggle foo
  on bar
  off baz

toggle foo
  on
    bar
  off
    baz

toggle foo on bar
  off toggle fizz on bizz
    off baz
```
js
```JavaScript
() => "foo"

(() => {console.log("foo")}); // ES6
(function() { return "foo"}).bind(this); // ES5

function() { console.log("foo"); };
function() { return "foo"; };
function declared() { return "foo"; }
function*() { yield 1; yield 2; }
do that(); while (true)
while(true) bar();
for(var i = 1; i < 0; i++)
{
  let a = 1;
}
// reserved word in taco
var then;

var MyModule = require('my-module');

(function() {})()
(function() {}())
```

taco
```
() =>> "foo"
() => console.log("foo")
() -> console.log("foo")
() ->> "foo"
function declared() ->> "foo"
() *->
  yield 1
  yield 2

do that() while true
while true then bar()
while true
  bar()

for i = 1 while i < 0 update i++
  bar()
for i = 1 while i < 0 update i++ then bar()
for i = 1 upto 0 by 1 then bar()
for i of [] then bar()

do
  a = 1

var the\u006e;
# idea: use use some kind of lookup table to determine the letter with the least amount of information density.

MyModule = require! 'my-module'
# of course, this should be replaced with a sweetjs macro when possible, so that the `!` isn't required (if i do implement sweetjs compatability)

exec () ->
exec#$invokeInParens$# () ->
```

### Semantic changes

Automatic local variables, using let, or var if in es5 mode.

global variables are declared with the `global` keyword.

### Other changes

js
```JavaScript
!foo;
```

taco
```
not foo
```

In addition to the syntax difference, the `not` operator will have lower precedence than logical OR (`or`/`||`), but higher than `?:`

### Low Priority changes

* Introduce a cast operator, instead of the practice of various conventions such as `+number` or `~~integer` or `'' + string`

js
```JavaScript
+number
~~integer
''+string
```

taco
```
n\number
i\integer
s\string
```

Precedence is equal to unary `+`, with right associativity. Additional operators can be added with sweet.js (when compatibility works).

* Discourage use of `,` except in argument lists, and as the comma operator. standard style will be with commas
  * maybe not, i'll rethink this
js
```JavaScript
array = [1, 2, 3, 1 + 2]
result = doThing(1, {})
object = {foo: 'bar', baz: 1}
```
taco
```
array = [1 2 3 (1 + 2)]
result = doThing(1 {})
object = {foo: bar , baz: 1}
object = {foo: bar (baz: 1)}
object = {
  foo: bar
  baz: 1
}
```

```
# even lispier example
a = [(doThing! (require! './a') 'a') 'a']
a = [doThing(require('./a')) 'a' 'a']

fs.readFile! './a.json', (err file) ->
  if err then throw err
  console.log! file.toString!
# note that, when decompiled, (without annotations) this should become
fs.readFile! './a.json', (err file) ->
  if err then throw err
  console.log(file.toString())
# unless ! is implemented as a sweetjs macro
```

conditional return shorthand

```
if foo then return bar
```
can be written as
```
if foo return bar
```

previous statement shorthand

Stylistically, longer statements should still use normal if statement syntax

the goal here is to keep the return keyword as close to the left hand side as possible to help readability for where functions exit



```
if foo and bar and baz and reallyLongFunctionNameWhyAreYouDoingThis()
  return bar
```

notes: special formatting directives: `#$DIRECTIVE_HERE$#`
include raw js (for empty statements): ```$`;// javascript here`#```

### indentation output directives
Since whitespace is significant, we need some way to control whitespace output for oddly formatted js

increase preceding indent: `>`  
decrease preceding indent: `<`  
replace preceding spaces: `r{\t\t}`  

so that would look like `#$<$#decreased_indent_statement()`

