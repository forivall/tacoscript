import limit from "call-limit";
import chokidar from "chokidar";
import {dest as globDest} from "glob-pair";
import minimatch from "minimatch";
import {toErrorStack, mkdirpWriteFile} from "./util"

import {CONCURRENT_LIMIT} from "./constants";

export default function (transform, files, opts/*, cb*/) {
  // TODO: only allow copy if src/dest are distinct

  let watcher;

  const onlyMatch = opts.only && new minimatch.Minimatch(`{${opts.only}}`, {matchBase: true});

  const onAddOrChange = limit((src, stats, done) => {
    // TODO: only filter if we're not copying
    if (onlyMatch && !onlyMatch.match(src)) return done(); // continue;

    transform(src, {
      onFileOpen() {
        if (opts.args.verbose) process.stdout.write(src);
      }
      /*TODO: sourcemap args*/
    }, (err, results) => {
      if (err) {
        if (opts.args.verbose) console.log(" ✗");
        console.error(toErrorStack(err));
        done();
        return;
      }
      if (opts.args.verbose) console.log(" ✓")
      if (results.ignored) {
        // TODO: copy if we should copy ignored files
        done();
        return;
      }

      const dest = globDest(src, files);
      watcher.unwatch(dest);

      mkdirpWriteFile(dest, results.code, (err) => {
        if (err) {
          console.error(err);
          done();
          return;
        }
        // TODO: write sourcemaps if requested

        if (!opts.args.quiet) console.log(src, "=>", dest);

        done();
      });
    });
  }, opts.args.serial ? 1 : CONCURRENT_LIMIT);

  watcher = chokidar.watch(files.src, {ignored: [/[\/\\]\./, "node_modules"]})
  .on('add', onAddOrChange)
  .on('change', onAddOrChange)
  // TODO
  // .on('unlink', (filepath) {
  //
  // })
}
