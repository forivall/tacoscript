import fs from "fs";
import path from "path";

import mkdirp from "mkdirp";

export function toErrorStack(err) {
  if ((err._babel || err._comal) && err instanceof SyntaxError) {
    return `${err.name}: ${err.message}\n${err.codeFrame}`;
  } else {
    return err.stack;
  }
}

export function mkdirpWriteFile(file, data, cb) {
  mkdirp(path.dirname(file), (err) => {
    if (err) {
      cb(err);
      return;
    }

    fs.writeFile(file, data, 'utf8', cb);
  })
}
