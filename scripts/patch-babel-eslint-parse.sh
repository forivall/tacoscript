#!/bin/sh
set -e

if ! [ -e node_modules/babel-eslint/.parse-patched ] ; then
  patch -p1 node_modules/babel-eslint/index.js ./scripts/babel-eslint-parse-opts.patch
  touch node_modules/babel-eslint/.parse-patched
fi
