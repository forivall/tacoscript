#!/usr/bin/env node

require("babylon");
var Parser = require("babylon/lib/parser").default;
var expect = require("chai").expect;
var functionHash = require("./_function-hash");
var pp = Parser.prototype;

expect(functionHash(pp.skipSpace)).to.equal('0aae7bd722190ba61b58881b6858e0cb');
expect(functionHash(pp.parseNew)).to.equal('db164cd9ab726f774a46f68cca32ecc1');
console.log("OK");
