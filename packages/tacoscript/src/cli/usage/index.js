
import fs from "fs";
import path from "path";

import eos from "end-of-stream";

export default function usage(subcommand, cb) {
  let helpFileName = path.join(__dirname, (subcommand || "usage") + ".txt");
  let helpFileStream = fs.createReadStream(helpFileName);
  helpFileStream.pipe(process.stdout);
  eos(helpFileStream, () => { cb({code: 0}); });
}
