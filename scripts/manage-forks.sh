#!/bin/sh
set -e

# NOTE: this script shouldn't actually run with --init, it's more for documentation

if ! git --git-dir ../babel/.git rev-parse 2>/dev/null ; then
  (cd ..
    git clone git://github.com/babel/babel.git
  )
fi

(cd ../babel;
  git checkout master
  git pull
  git subtree split -P packages/babel-traverse master -b subtree_babel-traverse
  git subtree split -P packages/babel-types master -b subtree_babel-types
)

if [ "$1" = "--init" ] ; then
  git subtree add -P packages/comal ../babel subtree_babel-core --squash
  git subtree add -P packages/comal-traverse ../babel subtree_babel-traverse --squash
  git subtree add -P packages/comal-types ../babel subtree_babel-types --squash
  git subtree add -P packages/tacoscript-dev-utils/fixture-runner ../babel subtree_babel-helper-transform-fixture-test-runner --squash
else
  git subtree pull -P packages/comal-traverse ../babel subtree_babel-traverse --squash
  git subtree pull -P packages/comal-types ../babel subtree_babel-types --squash
fi
