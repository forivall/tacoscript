#!/bin/sh
set -e

if ! git --git-dir ../babel/.git rev-parse 2>/dev/null ; then
  (cd ..
    git clone git://github.com/babel/babel.git
  )
fi

(cd ../babel;
  git checkout master
  git pull
  git subtree split -P packages/babel-core master -b subtree_babel-core
  git subtree split -P packages/babel-traverse master -b subtree_babel-traverse
  git subtree split -P packages/babel-types master -b subtree_babel-types
)

if [ "$1" == "--init" ] ; then
  git subtree add -P packages/comal ../babel subtree_babel-core --squash
  git subtree add -P packages/comal-traverse ../babel subtree_babel-traverse --squash
  git subtree add -P packages/comal-types ../babel subtree_babel-types --squash
else
  git subtree pull -P packages/comal ../babel subtree_babel-core --squash
  git subtree pull -P packages/comal-traverse ../babel subtree_babel-traverse --squash
  git subtree pull -P packages/comal-types ../babel subtree_babel-types --squash
fi
