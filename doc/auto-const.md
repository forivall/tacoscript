Automatic const
===============

Unlike coffeescript, which has automatic var declarations, tacoscript has
automatic const declaration.

This is superior because you will never have to worry about accidentally
modifying an automatically declared variable from somewhere earlier in the file,
because it will just be shadowed, and you should expect variables to be
shadowed.

It also encourages a functional style of programming.

### Transposition (javascript to tacoscript)

A const will be assumed automatic if:
  * it has a single initializer in the declaration.
  * it's not shadowing a mutable value (var, let, function, class)

The declaration can be moved inside of an expression context if its result is
used first in an expression context * this will be separate from the basic
auto-const plugin.

Example:

    {const a = 4 + 4; if (a > 7) {
      console.log(a);
    }}

is equivalent to

    if (a = 4 + 4) > 7
      console.log(a)

(TODO: explain why this scoping makes sense and is awesome.)

If a variable is not found in lexical scope, it will be added to an extern
declaration at the top of the lowest common scope.

### Composition (tacoscript to javascript)

A const will be automatically declared if

* it's not modifying a mutable variable already in the same scope (declared
  anywhere else in scope with a var, let, function, class, extern)

And the javascript that will be generated will follow the above two rules:
  * if the variable is used in a statement, generate a const in that location
  * if the variable is used in an expression, move the assignment to a new scope
    containing a const declaration directly before the first available statement
    parent of the expression

### Advanced expression usage

Initially, assignments after a short-circuiting boolean (`and` and `or`) will
be forbidden, since they're more complex to support. But they can eventually be
supported.

For example:

    if test() and (result = otherTest())
      use(result)

will initially be forbidden. However, it can eventually be translated to

    if (test()) {const result = otherTest(); if (result) {

    }}

Even more complex cases, or even simple cases with `or` would (A) need more
complex transformation, or (B) use let, but add a check (for tacoscript) and an
eslint plugin (for javascript) forbid / discourage modification within the
block.

In this case, the following would be the compositions:

    if (result = test()) or (result2 = otherTest())
      use(result, result2)
      result = 5 # SyntaxError

(A)

    {const result = test(), result2 = result ? undefined : otherTest(); if (result || result2) {
      use(result, result2);
    }}

(B)

    {let result, result2; if ((result = test()) || (result2 = otherTest())) {
      /\* const result, result2 \*/
      use(result, result2);
    }}

Ideally, this could be also implemented as a babylon plugin (since it doesn't
require any new syntax; `extern` can be defined as a top level `var`) & also
submitted to tc39 as a proposal for strict-mode only.

Dual declarations are invalid:  

    if (result = test()) or (result = otherTest())

obviously, that should be

    if (result = test() or otherTest())

but other, more complex possible double assignments could be
