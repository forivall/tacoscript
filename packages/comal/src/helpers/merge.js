/* @flow */

import mergeWith from "lodash/mergeWith";
import union from "lodash/union";

// Deeply merges two objects, ignoring null and undefined, and unions arrays
// TODO: see if this can just be replaced with lodash v4 merge
export default function (dest?: Object, src?: Object): ?Object {
  if (!dest || !src) return;

  return mergeWith(dest, src, function (a, b) {
    if (b && Array.isArray(a)) {
      return union(b, a);
    }
  });
}
