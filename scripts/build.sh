#!/bin/sh
set -e

PARALLEL=false
[ "$1" = "--parallel" ] && PARALLEL=true && shift
[ "$1" = "--watch" ] && PARALLEL=true

run() {
  node node_modules/babel-cli/bin/babel "$f/src" --out-dir "$f/lib" --copy-files "$@"
}

for f in packages/*; do
  if [ -n "$PACKAGE" ] && [ packages/"$PACKAGE" != $f ] ; then continue; fi
  if [ -d "$f/src" ]; then
    if $PARALLEL ; then
      run "$@" &
    else
      run "$@"
    fi
  fi
done

wait
