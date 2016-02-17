
// TODO: export to external module
//       when i do, add option to not fully traverse into a directory,
//       and option to not traverse into symlinks
//
// TODO: UNIT TESTS!!! ROBUST CONTRACTS W.R.T. INPUT AND OUTPUT

// tries to match globs with a target destination, so things like
// {src: ['packages/*/src'], dest: ['dist']} are possible.
//
// eventually, something like
//
// {src: ['packages/*/src/*'], dest: ['packages/*/lib']}
//
// should be possible.
//
// For now, something like `scripts/_get-test-directories.sh` can be used for this multi src-dest purpose.


import path from "path";

import asyncaphore from "asyncaphore";
import glob from "glob";
import globCommon from "glob/common";
const {Glob} = glob;
import isGlob from "is-glob";
import forEach from "lodash/forEach";
import map from "lodash/map";
import isArray from "lodash/isArray";

function ownProp (obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field)
}

export default function walk(args: Object, eachCb, cb) {
  return new Walker(args, eachCb, cb).walk(args);
}

// it's a zombie! run!
export class Walker {
  constructor(...args) {
    this.cb = args.pop();
    this.eachCb = args.pop();
    const opts = args[0] || {};

    this.destExt = opts.destExt;

    this._asyncBlock = asyncaphore((err) => {
      if (err) {
        if (!this.aborted) this.abort();
        return (0, this.cb)(err);
      }
      return (0, this.cb)();
    });
    this.retain = this._asyncBlock.retain;
    this.release = this._asyncBlock.release;

    // cwd & root logic borrowed from glob, used in makeAbs
    this.changedCwd = false;
    const cwd = process.cwd();
    if (!ownProp(opts, "cwd"))
      this.cwd = cwd;
    else {
      this.cwd = path.resolve(opts.cwd);
      this.changedCwd = this.cwd !== cwd;
    }

    this.root = opts.root ? path.resolve(opts.root) : path.resolve(this.cwd, "/");
    if (process.platform === "win32") this.root = this.root.replace(/\\/g, "/")

    this._pending = 0;

    this.nextGlobId = 0;
    this.pendingGlobs = Object.create(null);

    this.aborted = false;
    this.seen = Object.create(null);

    // Shared cache between different glob invokations
    this.realpathCache = Object.create(null);
    this.globCache = Object.create(null);
    this.statCache = Object.create(null);
    this.symlinks = Object.create(null);
  }

  walk({src: globs, dest: dests}) {
    if (this._pending > 0) throw new Error("Not reentrant");

    const hasDest = !!dests;
    const oneDest = hasDest && dests.length === 1;
    // assert oneDest || dests.length === globs.length
    for (let i = 0, len = globs.length; i < len; i++) {
      const globPat = globs[i];
      const dest = hasDest && (oneDest ? dests[0] : dests[i]);
      if (isGlob(globPat)) {
        this.walkGlob(globPat, dest);
      } else {
        this.walkPathDirect(globPat, dest);
      }
    }
    return this;
  }

  _globOpts(opts = {}) {
    opts.realpathCache = this.realpathCache;
    opts.cache = this.globCache;
    opts.statCache = this.statCache;
    opts.symlinks = this.symlinks;
    return opts;
  }

  walkGlob(globPat, dest) {
    // TODO: match dest according to globbing
    const dests = dest ? [dest] : false;

    const globberId = this.nextGlobId++;
    // stat all paths, since we'll be walking into found directories
    this.retain();
    this.pendingGlobs[globberId] = new Glob(globPat, this._globOpts({stat: true}), (err, matches) => {
      if (this.aborted) return;
      if (err) return this.abort(err);

      this.pendingGlobs[globberId] = undefined;
      this.walkPaths(matches, dests, globPat.slice(-1) !== "*");
      this.release();
    });
  }

  walkPaths(paths, dests, direct) {
    const hasDest = !!dests;
    const oneDest = hasDest && dests.length === 1;
    // assert oneDest || dests.length === paths.length
    for (let i = 0, len = paths.length; i < len; i++) {
      const src = paths[i]
      const dest = hasDest && (oneDest ? path.join(dests[0], path.basename(src)) : dests[i]);
      this.walkPath(src, dest, direct);
    }
  }

  _makeAbs(f) {
    return globCommon.makeAbs(this, f);
  }

  walkPathDirect(src, dest) {
    // perform a glob just to populate the stat cache
    const globberId = this.nextGlobId++;
    this.retain();
    this.pendingGlobs[globberId] = new Glob(src, this._globOpts({stat: true}), (err) => {
      if (this.aborted) return;
      if (err) return this.abort(err);

      this.pendingGlobs[globberId] = undefined;
      this.walkPath(src, dest, true);
      this.release();
    });
  }

  walkPath(src, dest, direct = false) {
    const cacheKey = this._makeAbs(src);
    const seen = this.seen[cacheKey];
    if (seen) return;
    this.seen[cacheKey] = true;

    const cacheItem = this.globCache[cacheKey];

    if (cacheItem === "DIR" || isArray(cacheItem)) {
      const globberId = this.nextGlobId++;
      this.retain();
      this.pendingGlobs[globberId] = new Glob(src + "/**", this._globOpts(), (err, matches) => {
        if (this.aborted) return;
        if (err) return this.abort(err);

        this.pendingGlobs[globberId] = undefined;

        if (direct) {
          const dests = map(matches, (match) => path.join(dest, this.removeLeadingParentDirs(match)));

          this.walkPaths(matches, dests);
        } else {
          const srcPathLen = src.length;
          const dests = map(matches, (match) => dest + match.slice(srcPathLen));

          this.walkPaths(matches, dests);
        }
        this.release();
      });
    } else {
      (0, this.eachCb)(src, this.replaceExt(dest));
    }
  }

  abort(err) {
    this.aborted = true;
    forEach(this.pendingGlobs, (globber) => { globber && globber.abort(); });
    this.pendingGlobs = Object.create(null);
    this._asyncBlock.error(err);
  }

  replaceExt(dest) {
    if (!this.destExt) return dest;
    const p = path.parse(dest);
    p.base = path.basename(p.base, p.ext) + this.destExt;
    return path.format(p);
  }

  removeLeadingParentDirs(dest) {
    const normDest = path.normalize(dest);
    const i = normDest.lastIndexOf("../");
    return i >= 0 ? normDest.slice(i + 3) : dest;
  }
}
