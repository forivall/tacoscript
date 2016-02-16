
import fs from "fs";

export default function usage(subcommand, cb) {
  let helpFileName = __dirname + "/usage" + (subcommand ? "-" + subcommand : "") + ".txt";
  return fs.createReadStream(helpFileName)
    .pipe(process.stderr)
    .on('close', () => cb({code: 1}));
}
