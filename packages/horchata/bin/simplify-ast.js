#!/usr/bin/env node

var removeLocInfo = require("../../tacoscript-dev-utils").removeLocInfo;

var stdin = '';
process.stdin.on('readable', function() {
  var chunk;
  while (chunk = process.stdin.read()) {
    stdin += chunk;
  }
}).on('end', function() {
  process.stdout.write(JSON.stringify(removeLocInfo(JSON.parse(stdin)), null, '  '));
});
