import fs from "fs";
import path from "path";

import asyncaphore from "asyncaphore";
import limit from "call-limit";
import {walk as globPair} from "glob-pair";
import minimatch from "minimatch";
import mkdirp from "mkdirp";

export default function (api, transformer, files, opts, cb) {
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

    api.execFile(transformer, src, {
      onFileOpen(file) {
        if (opts.args.verbose) process.stdout.write(src);
      }
      /*TODO: sourcemap args*/
    }, (err, data) => {
      if (err) {
        if (opts.args.verbose) console.log();
        return cb2(err);
      }
      if (opts.args.verbose) console.log(" ✓")
      if (data.ignored) {
        // TODO: copy if we should copy ignored files
        done(), release();
        return;
      }
      // TODO: change extname of dest

      mkdirp(path.dirname(dest), (err) => {
        if (err) return cb2(err);

        fs.writeFile(dest, data.code, 'utf8', (err) => {
          if (err) return cb2(err);
          // TODO: write sourcemaps if requested

          if (!opts.args.quiet) console.log(src, "=>", dest);

          done(), release();
        });
      });
    });

    // TODO: copy files

  }, opts.args.serial ? 1 : 128), (err) => {
    if (err) return cb2(err);
    release();
  });
}
