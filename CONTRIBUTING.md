
**[Setup](#setup) | [Running Tests](#running-tests) | [Internals](#internals)**

----

# Contributing

Contributions are always welcome, no matter how large or small. Before
contributing, please read the
[code of conduct](https://github.com/forivall/tacoscript/blob/master/CODE_OF_CONDUCT.md).

## Developing

#### Setup

```sh
$ git clone https://github.com/forivall/tacoscript
$ cd tacoscript
$ make bootstrap
```

Then you can either run:

```sh
$ make build
```

to build Babel **once** or:

```sh
$ make watch
```

to have Tacoscript build itself then incrementally build files on change.

#### Running tests

You can run tests for all packages via:

```sh
$ make test
```

This is mostly overkill and you can limit the package to a select by using the `TEST_ONLY` environment variable:

```sh
$ TEST_ONLY=tacoscript-cli make test
```

Use the `TEST_GREP` variable to run a subset of tests by name:

```sh
$ TEST_GREP=transformation make test
```

To test the code coverage, use:

```sh
$ make test-cov
```
