#!/bin/sh
set -e

for f in packages/*; do
  if [ -n "$PACKAGE" ] && [ packages/"$PACKAGE" != $f ] ; then continue; fi
  if [ -d "$f/src" ]; then
    node node_modules/babel/bin/babel "$f/src" --out-dir "$f/lib" --copy-files "$@" &
  fi
done

wait
