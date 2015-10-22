// Helper to check if a function that we have completely overridden has changed
// from when it was originally overridden

var createHash = require('create-hash');

module.exports = function functionHash(fn) {
  var hash = createHash('md5');
  hash.update(fn.toString());
  return hash.digest().toString('hex');
};
