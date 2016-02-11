# comal

> Tacoscript transformation core.

Originally forked from `babel-core`. Significant differences include removal
of hardcoded ids, allows custom generators and parsers, uses `comal-types` and
`comal-traverse` instead of their babel counterparts, and splits up babel-core's
`File` (which contains the data and performs the transformation) into
`Transformation` (which just performs the transformation) and `File` (which just
contains the data).

## Install

```
$ npm install comal
```

## Usage

```js
import comal from 'comal';

const minimalBabel = new Api({
  parser: require("babylon"),
  parserOpts: function(opts) {
    return {
      highlightCode: opts.highlightCode,
      sourceType:    opts.sourceType,
      filename:      opts.filename,
      plugins:       []
    };
  },
  generator: { generate: require("babel-generator").default },
  generatorOpts: function(opts) {
    return {
      filename: opts.filename
    }
  }
});

// not implemented yet
const tacoscriptCompiler = new Api({
  parser: require("horchata"),
  generator: require("alpastor")
});

const code = `a = () ->`;
const result = tacoscriptCompiler.transform(code, { /* options */ });

result.code; // Generated JavaScript code
result.map; // Sourcemap
result.ast; // AST

import {render} from 'tacoscript-cst-utils';
render(result.ast, 'tacoscriptSourceElements'); // whitespace-preserved tacoscript
render(result.ast, 'sourceElements'); // whitespace-preserved javascript

import generateTacoscript from 'tacotruck';
generateTacoscript(result.ast); // Generated tacoscript code
```

## format of api config

For now, see `cleanMeta()` in `options/loader` and `transformation/index`
