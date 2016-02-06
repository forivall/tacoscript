# comal

> Tacoscript transformation core.

## Install

```
$ npm install comal
```

## Usage

```js
import babel from 'babel-core';

const code = `a = () ->`;
const result = comal.transform(code, { /* options */ });

result.code; // Generated code
result.map; // Sourcemap
result.ast; // AST

import {render} from 'tacoscript-cst-utils';
render(result.ast, 'tacoscriptSourceElements'); // whitespace-preserved tacoscript
render(result.ast, 'sourceElements'); // whitespace-preserved javascript

import generateTacoscript from 'tacotruck';
generateTacoscript(result.ast); // Generated tacoscript code
```
