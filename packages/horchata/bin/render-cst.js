#!/usr/bin/env node

var render = require("../lib/util/render-cst");

var stdin = '';
process.stdin.on('readable', function() {
  var chunk;
  while (chunk = process.stdin.read()) {
    stdin += chunk;
  }
}).on('end', function() {
  process.stdout.write(render(JSON.parse(stdin)));
});
