#!/usr/bin/env node
var fs = require('fs');

var pkg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

var VERSION = fs.readFileSync(__dirname + "/../VERSION", 'utf8');

var newpkg = {
  "name": pkg.name,
  "version": pkg.version || VERSION,
  "description": pkg.description || pkg.name,
  "keywords": pkg.keywords && pkg.keywords.indexOf("tacoscript") >= 0 ? pkg.keywords : ["tacoscript"].concat(pkg.keywords || []),
  "homepage": "https://github.com/forivall/tacoscript/tree/master/packages/" + pkg.name,
  "bugs": {
    "url": "https://github.com/forivall/tacoscript/issues"
  },
  "license": pkg.license,
  "author": pkg.author,
  "contributors": pkg.contributors,
  "main": pkg.main || "index.js",
  "browser": pkg.browser,
  "bin": pkg.bin,
  "repository": "git://github.com/forivall/tacoscript.git",
  "publishConfig": {
    "registry": "http://registry.npmjs.org"
  },
  "scripts": pkg.scripts,
  "dependencies": pkg.dependencies,
  "devDependencies": pkg.devDependencies,
  "peerDependencies": pkg.peerDependencies,
  "optionalDependencies": pkg.optionalDependencies
}

for (var k in pkg) {
  if (!(k in newpkg)) {
    newpkg[k] = pkg[k];
  }
}

fs.writeFileSync(process.argv[2], JSON.stringify(newpkg, null, '  ') + '\n', 'utf8');
