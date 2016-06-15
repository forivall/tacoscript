#!/bin/sh
set -e

TEST_DIRS=""

for f in packages/*; do
  if [ -n "$TEST_ONLY" ] && [ `basename $f` != "$TEST_ONLY" ]; then
    continue
  fi

  if [ -n "$TEST_SKIP" ] && [ `basename $f` = "$TEST_SKIP" ]; then
    continue
  fi

  if [ -d "$f/test" ]; then
    TEST_DIRS="$f/test $TEST_DIRS"
  fi
done

echo $TEST_DIRS
