
# Now

* [x] Refactor indented list parsing
* [x] Use "extra" style ast properties for ast properties that aren't gibson042's proposed CST node properties.
* [x] Use comments when generating
* [x] Store cst data when parsing
  * [x] Fix tests (core/comments/base/\*)
  * [x] Add tests to make sure that original source can be constructed from cst
* [x] Convert cst data to comment attachment when parsing
  * [x] Add tests for in-comment escaping (`/*` ⇆ `/ *`, `# *` ⇆ `#*`)
* [ ] Create cst-aware js generator; use cst data when generating javascript
  * [ ] Clone the tree, replace tacoscript cst elements with js cst elements,
        then simply print the CST.
* [ ] Write tacoscript mode for codemirror
* [ ] Use cst data when generating tacoscript
  * [ ] Instead of pushing tokens to a continuous token stream, enrich the ast
        with cst elements. https://github.com/estools/escodegen/wiki/CST-Proposals

# Far flung future

See if it's possible to write plugins using https://github.com/zkat/mona, write a tutorial if so.
