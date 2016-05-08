
import resolve from "../helpers/resolve";

/**
 * Resolves presets options which can be either direct object data,
 * or a module name to require.
 */
export function resolvePresets(presets: Array<string | Object>, dirname: string, prefix?: string, onResolve?) {
  return presets.map((val) => {
    if (typeof val === "string") {
      let presetLoc = prefix && resolve(`${prefix}-${val}`, dirname) || resolve(val, dirname);
      if (presetLoc) {
        let val = require(presetLoc);
        onResolve && onResolve(val, presetLoc);
        return val;
      } else {
        throw new Error(`Couldn't find preset ${JSON.stringify(val)} relative to directory ${JSON.stringify(dirname)}`);
      }
    } else if (typeof val === "object") {
      onResolve && onResolve(val);
      return val;
    } else {
      throw new Error(`Unsupported preset format: ${val}.`);
    }
  });
}
