#!/bin/sh

node ../bin/tacoscript.js compose ./fixtures/cli/convertBaseFileName.taco --generate \[ --retain-lines \]

# should equal
: <<END
function baseFileName(
file,
stripExt = no,
useWinPathSep = no)
{
  pathSep = useWinPathSep ? /\\|\// : /\//;
  parts = file.split(pathSep);
  file = parts[parts.length - 1];
  if (!(stripExt && file.indexOf('.') >= 0)) return file;
  parts = file.split('.');
  parts.pop();

  if (['taco', 'tacos', 'tacoscript'].contains(parts[parts.length - 1]) && parts.length > 1) {
    parts.pop();}
  return parts.join('.');}


function convert(dest, extension = '.js') {
  basename = baseFileName(source, yes, useWinPathSep);
  srcDir = path.dirname(source);
  return path.join(path.dirname(dest), basename + extension);}
END
