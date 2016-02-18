
import fs from "fs";
import eos from "end-of-stream";

export default function usage(subcommand, cb) {
  let helpFileName = __dirname + "/usage" + (subcommand ? "-" + subcommand : "") + ".txt";
  let helpFileStream = fs.createReadStream(helpFileName);
  helpFileStream.pipe(process.stdout);
  eos(helpFileStream, () => { cb({code: 0}); });
}
