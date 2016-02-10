#!/bin/sh
set -e

for f in packages/*; do
  if [ -e $f/package.json ] && < $f/package.json jq -e .scripts."$1"test > /dev/null; then
    echo $f $1"test"
    (cd $f; npm run "$1"test)
  fi
done
