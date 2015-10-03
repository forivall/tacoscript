#!/bin/sh
set -e

BROWSERIFY_CMD="node_modules/browserify/bin/cmd.js"

mkdir -p dist

node packages/tacoscript/scripts/cache-templates
node packages/tacoscript/scripts/build-tests
node packages/tacogen/scripts/build-tests
node $BROWSERIFY_CMD -e test/browser.js >dist/browser-test.js
rm -f packages/tacoscript/templates.json packages/tacoscript/tests.json packages/tacogen/tests.json

OPEN_CMD=
test -n "`which open`" && OPEN_CMD=open
test -z "$OPEN_CMD" && test -n "`which xdg-open`" && OPEN_CMD=xdg-open
test -n "$OPEN_CMD" && $OPEN_CMD test/browser.html
