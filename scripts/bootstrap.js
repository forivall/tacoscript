#!/usr/bin/env node
require("shelljs/global");

var path = require("path");
var fs   = require("fs");

// get packages
function getPackages(dir) {
  var packages = [];
  ls(dir + '/*').forEach(function (loc) {
    if (!test('-d', loc)) { return; }
    var name = path.basename(loc);
    if (name[0] !== ".") {
      var pkg = require("../" + dir + "/" + name + "/package.json");
      packages.push({
        folder: name,
        pkg: pkg,
        name: pkg.name
      });
    }
  });
  return packages;
}
var packages = getPackages("packages");
var babelPackages = getPackages("babel/packages");

// create links
packages.forEach(function (root) {
  console.log(root.name);
  console.log(root.folder);

  var nodeModulesLoc = "packages/" + root.folder + "/node_modules";
  mkdir("-p", nodeModulesLoc);

  packages.forEach(function (sub) {
    if (!root.pkg.dependencies || !root.pkg.dependencies[sub.name]) return;

    if (!fs.existsSync(nodeModulesLoc + "/" + sub.name)) {
      console.log("Linking", "packages/" + sub.folder, "to", nodeModulesLoc + "/" + sub.name);
      ln("-s", "packages/" + sub.folder, nodeModulesLoc + "/" + sub.name);
    }
  });
  babelPackages.forEach(function (sub) {
    if (!root.pkg.dependencies || !root.pkg.dependencies[sub.name]) return;

    if (!fs.existsSync(nodeModulesLoc + "/" + sub.name)) {
      console.log("Linking", "babel/packages/" + sub.folder, "to", nodeModulesLoc + "/" + sub.name);
      ln("-s", "babel/packages/" + sub.folder, nodeModulesLoc + "/" + sub.name);
    }
  });

  cd("packages/" + root.folder);
  exec("npm install");
  // exec("npm link");
  cd("../..");
});

// exec("git submodule update --init");
exec("make build");
