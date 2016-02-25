
import asyncaphore from "asyncaphore";
import limit from "call-limit";
import {walk as globPair} from "glob-pair";
import minimatch from "minimatch";

import {CONCURRENT_LIMIT} from "./constants";
import {toErrorStack, mkdirpWriteFile} from "./util";

export default function (transform, files, opts, cb) {
  // TODO: only allow copy if src/dest are distinct

  const onlyMatch = opts.only && new minimatch.Minimatch(`{${opts.only}}`, {matchBase: true});

  let walker;
  const {retain, release, error: cb2} = asyncaphore((err) => {
    if (err) {
      if (walker) walker.abort();
      return cb(err);
    }
    if (opts.args.verbose) console.warn("Done.");
    cb();
  });

  retain();

  walker = globPair(files, limit((src, dest, done) => {
    // TODO: only filter if we're not copying
    if (onlyMatch && !onlyMatch.match(src)) return done(); // continue;

    retain();

    transform(src, {
      onFileOpen() {
        if (opts.args.verbose) process.stdout.write(src);
      }
      /*TODO: sourcemap args*/
    }, (err, results) => {
      if (err) {
        if (opts.args.verbose) console.log(" ✗");
        console.error(toErrorStack(err));
        cb2(err);
        return;
      }
      if (opts.args.verbose) console.log(" ✓")
      if (results.ignored) {
        // TODO: copy if we should copy ignored files
        done(), release();
        return;
      }

      mkdirpWriteFile(dest, results.code, 'utf8', (err) => {
        if (err) return cb2(err);
        // TODO: write sourcemaps if requested

        if (!opts.args.quiet) console.log(src, "=>", dest);

        done(), release();
      });
    });

    // TODO: copy files

  }, opts.args.serial ? 1 : CONCURRENT_LIMIT), (err) => {
    if (err) return cb2(err);
    release();
  });
}
