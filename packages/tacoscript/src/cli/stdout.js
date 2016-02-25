// Eventually, comal should be able to write to streams directly

export default function(data, cb) {
  process.stdout.setEncoding("utf8");

  process.stdout.write(data);

  setImmediate(cb);
}
