
export default function(args, parentArgs, cb) {
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
