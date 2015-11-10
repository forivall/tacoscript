Notes about parsing:
==========================

`isContextual` isn't needed in horchata, because keywords are always keywords.


isFor is equivalent to "noIn", since we could introduce more `for` iteration keywords
that could also be used as operators.


Make sure to resolve https://github.com/babel/babel/issues/2823, ignore its error,
and generate valid code.
