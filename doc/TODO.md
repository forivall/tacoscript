
# Now

* [x] Refactor indented list parsing
* [x] Use "extra" style ast properties for ast properties that aren't gibson042's proposed CST node properties.
* [x] Use comments when generating
* [x] Store cst data when parsing
  * [x] Fix tests (core/comments/base/\*)
  * [ ] Add tests to make sure that original source can be constructed from cst
* [ ] Convert cst data to comment  when parsing
* [ ] Create cst-aware js generator; use cst data when generating javascript
* [ ] Write tacoscript mode for codemirror
* [ ] Use cst data when generating tacoscript

# Far flung future

See if it's possible to write plugins using https://github.com/zkat/mona, write a tutorial if so.
