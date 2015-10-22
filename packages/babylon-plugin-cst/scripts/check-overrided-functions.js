#!/usr/bin/env node

var Parser = require("babylon/lib/parser").default;
var expect = require("chai").expect;
var functionHash = require("./_function-hash");
var pp = Parser.prototype;

expect(functionHash(pp.skipSpace)).to.equal('0aae7bd722190ba61b58881b6858e0cb');
console.log("OK");
