
import readPackageJson from "read-package-json";
import path from "path";

const MODULES_ROOT = path.normalize(__dirname, "../../../node_modules")

export default function(args, cb) {
  var v = {}

  for (let p of ['../../..', 'horchata', 'comal', 'tacotruck', 'babel-generator', 'babylon']) {
    let data = require(p + '/package.json');
    if (data && data.name && data.version) v[data.name] = data.version
  }
  Object.keys(process.versions).sort().forEach(function (k) {
    v[k] = process.versions[k]
  })

  console.log(v);
  cb();
}
