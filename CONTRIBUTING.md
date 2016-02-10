
**[Setup](#setup) | [Running Tests](#running-tests) | [Internals](#internals)**

----

# Contributing

Contributions are always welcome, no matter how large or small. Before
contributing, please read the [code of conduct].

## Committing

Please follow the [commit message format] for your pull requests and for your
commits.

## Developing

### Setup

```sh
$ git clone https://github.com/forivall/tacoscript
$ cd tacoscript
$ npm run bootstrap
```

Then, after making changes, you can either run:

```sh
$ npm run build
```

to build Tacoscript **once** or:

```sh
$ npm run watch
```

to have Tacoscript build itself then incrementally build files on change.

#### Using gulp and sourcemaps

If you want sourcemaps with your build, or if you find that the watch script is
slow, you can use gulp instead.

```sh
$ npm run install-potato # (once)
$ npm run watch-dev
# or
$ gulp watch
```

### Running tests

__Note:__ Make sure you have already built the code (or are using watch) prior
to running tests.

You can run tests for all packages via:

```sh
$ npm run test
```

This is mostly overkill and you can limit the package to a select by using the `TEST_ONLY` environment variable:

```sh
$ TEST_ONLY=horchata make test
```

You can also run tests directly from within a package directory:
```sh
$ cd packages/horchata
$ npm run test
```

`mocha` can also be run directly, to pass other arguments, but only when inside
a package directory.

```sh
$ cd packages/horchata
$ mocha --grep "location"
```

To test the code coverage, use:

```sh
$ npm run test-cov
```

[code of conduct]: https://github.com/forivall/tacoscript/blob/master/CODE_OF_CONDUCT.md
[commit message format]: https://github.com/forivall/tacoscript/blob/master/doc/commit_message_format.md
