/*
 * Simple async block / semaphore mechanism, calls callback when # of release
 * calls === # of retain calls
 */

export default function(cb) {
  let _pending = 0, _err;
  return {
    // get _pending() { return _pending; },
    // get _err() { return _err; },
    retain() { _pending++; },
    release() {
      if (_err) return;
      _pending--;
      if (_pending === 0) {
        // TODO: wait for nextTick & re-check
        cb();
      } else if (_pending < 0) {
        throw new Error("retain/release mismatch");
      }
    },
    error(err) {
      if (_err) return;
      _err = err;
      cb(err);
    }
  };
}
