/*
 * Copyright (C) 2012-2014 by various contributors (see doc/ACORN_AUTHORS)
 * Copyright (C) 2015 Jordan Klassen <forivall@gmail.com>
 *
 * See LICENSE for full license text
 */

// Which Unicode version should be used?
var version = '8.0.0';

function pad(str, width) {
  while (str.length < width) str = "0" + str;
  return str;
}

function esc(code) {
  var hex = code.toString(16);
  if (hex.length <= 2) return "\\x" + pad(hex, 2);
  else return "\\u" + pad(hex, 4);
}

function generate(chars) {
  var astral = [], re = "";
  for (var i = 0, at = 0x10000; i < chars.length; i++) {
    var from = chars[i], to = from;
    while (i < chars.length - 1 && chars[i + 1] == to + 1) {
      i++;
      to++;
    }
    if (to <= 0xffff) {
      if (from == to) re += esc(from);
      else if (from + 1 == to) re += esc(from) + esc(to);
      else re += esc(from) + "-" + esc(to);
    } else {
      astral.push(from - at, to - from);
      at = to;
    }
  }
  return {nonASCII: re, astral: astral};
}

var fs = require("fs");

/* My laptop is a potato. */

var startFileName = __dirname + "/../src/util/_identifierStartData.js";
console.log("Writing " + startFileName);
var start = require('unicode-' + version + '/properties/ID_Start/code-points')
    .filter(function(ch) { return ch > 127; });
var startData = generate(start);
fs.writeFileSync(startFileName,
  "export const nonASCIIidentifierStartChars = \"" + startData.nonASCII + "\";\n" +
  "export const astralIdentifierStartCodes = " + JSON.stringify(startData.astral) + ";\n"
, {encoding: "utf8"});

startData = null;

var contFileName = __dirname + "/../src/util/_identifierContData.js"
console.log("Writing " + contFileName);
var cont = [0x200c, 0x200d].concat(require('unicode-' + version + '/properties/ID_Continue/code-points')
    .filter(function(ch) { return ch > 127 && start.indexOf(ch) == -1; }));
var contData = generate(cont);
fs.writeFileSync(contFileName,
  "export const nonASCIIidentifierChars = \"" + contData.nonASCII + "\";\n" +
  "export const astralIdentifierCodes = " + JSON.stringify(contData.astral) + ";\n"
, {encoding: "utf8"});
cont = null;
contData = null;
