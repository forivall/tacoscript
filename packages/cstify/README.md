cstify
======

Adds cst elements to an estree / babel ast, according to the
[proposed][cst-spec-pr] [estree specification][cst-spec].

Currently requires the original source code and location information. Will be
updated to be able to automatically infer what whitespace / cst elements are
required to create valid javascript when rendered, both pretty and minimal
formats.

[cst-spec-pr]: https://github.com/estree/estree/pull/107
[cst-spec]: https://github.com/gibson042/estree/blob/gh-41/spec.md
