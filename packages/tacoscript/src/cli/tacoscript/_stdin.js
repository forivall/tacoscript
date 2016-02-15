// Eventually, comal will be able to read streams directly

export default function(cb) {
  var code = "";

  process.stdin.setEncoding("utf8");

  process.stdin.on("readable", function () {
    var chunk = process.stdin.read();
    if (chunk !== null) code += chunk;
  });

  process.stdin.on("end", function () {
    cb(null, code);
  });
}
