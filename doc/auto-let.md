Automatic let
=============

translation logic: a let will be assumed automatic if:
  * it's not shadowing another variable in the scope
  * and
  * it has a initialization in its declaration and it's the only declaration in its block
  * or
  * its first use is in an expression context and its declaration is the statement immediately preceding its use in an expression

if a variable is not found in lexical scope, it will be added to an extern declaration at the top of the lowest common scope.

so for compilation, a let will be automatically declared if
  * it's not already in scope (declared anywhere else in scope with a var, function, let, const, extern)

and the javascript that will be generated will follow the above two rules:
  * if the variable is used in a statement, generate a let in that location
  * if the variable is used in an expression, generate a let directly before the first available statement parent of the expression

add some kind of warning about possible mistakes, i.e. if two uses of automatic variables are > 30 lines apart, or some amount of cyclic complexity apart. should be built as an eslint plugin
