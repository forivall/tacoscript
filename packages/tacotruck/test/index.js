/*global suite,test*/
require('source-map-support').install();
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const babylon = require('babylon');
const horchata = require('horchata');
const cstify = require('cstify').default;
const tacotruck = require("../lib/index");

suite('tacotruck', function () {
  test('block comment before close paren bug', function () {
    var ast = babylon.parse(
      'foo(function () {beep();/*bar*/});\n'
    );

    var tacoCode = tacotruck.generate(ast).code;

    try {
      horchata.parse(tacoCode); // shouldn't error
    } catch (e) {
      throw new Error('generated invalid code:\n' + tacoCode)
    }
  })
})
