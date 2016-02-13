
import fs from "fs";

export default function usage(subcommand) {
  let helpFileName = __dirname + "/usage" + (subcommand ? "-" + subcommand : "") + ".txt";
  return fs.createReadStream(helpFileName)
    .pipe(process.stderr)
    .on('close', () => process.exit(1))
}
