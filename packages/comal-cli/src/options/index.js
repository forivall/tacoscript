/* @flow */

import * as parsers from "./parsers";
import config from "./config";

export { config };

export function normaliseOptions(options: Object = {}): Object {
  for (let key in options) {
    let val = options[key];
    if (val == null) continue;

    let opt = config[key];
    if (opt && opt.alias) opt = config[opt.alias];
    if (!opt) continue;

    let parser = parsers[opt.type];
    if (parser) val = parser(val);

    options[key] = val;
  }

  return options;
}
