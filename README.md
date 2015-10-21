Tacoscript
==========

An es2015+-isomorphic altjs language, with syntax inspired by Coffeescript,
Python, Ruby, and [frappe](https://github.com/lydell/frappe).

<h2><a href="./doc/SPEC.md">See the Spec</a></h2>

Architecture inspired by Babel.

In order to preserve whitespace, etc, the AST is annotated in a similar method
to https://github.com/estree/estree/issues/41#issuecomment-131636382 . The
tacoscript parser, horchata, performs this annotation natively, and a plugin to
babel's babylon is used to do the annotation when parsing javascript.



---

Why does this exist? For the same reason that there are both British English and
American English: Some people just prefer different conventions.
