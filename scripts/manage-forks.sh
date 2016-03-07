#!/bin/sh
set -e

# NOTE: this script shouldn't actually run with --init, it's more for documentation

if ! git --git-dir ../babel/.git rev-parse 2>/dev/null ; then
  (cd ..
    git clone git://github.com/babel/babel.git
  )
fi

(cd ../babel;
  if ! git remote get-url forivall >/dev/null 2>/dev/null ; then
    git remote add forivall git://github.com/forivall/babel.git
    git checkout -b lodash-v4 forivall/lodash-v4
  fi
  git checkout lodash-v4
  git pull
  git subtree split -P packages/babel-traverse lodash-v4 -b subtree_babel-traverse_lodash-v4
  git subtree split -P packages/babel-types lodash-v4 -b subtree_babel-types_lodash-v4
)

if [ "$1" = "--init" ] ; then
  # git subtree add -P packages/comal ../babel subtree_babel-core_v4 --squash
  git subtree add -P packages/comal-traverse ../babel subtree_babel-traverse_lodash-v4 --squash
  git subtree add -P packages/comal-types ../babel subtree_babel-types_lodash-v4 --squash
  # git subtree add -P packages/tacoscript-dev-utils/fixture-runner ../babel subtree_babel-helper-transform-fixture-test-runner --squash
else
  git subtree pull -P packages/comal-traverse ../babel subtree_babel-traverse_lodash-v4 --squash
  git subtree pull -P packages/comal-types ../babel subtree_babel-types_lodash-v4 --squash
fi
