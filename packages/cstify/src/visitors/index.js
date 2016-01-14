
const builtin = {}, builtins = [];
import newNoParens from './new-no-parens'; builtin['new-no-parens'] = newNoParens; builtins.push(newNoParens);
import trailingCommas from './trailing-commas'; builtin['trailing-commas'] = trailingCommas; builtins.push(trailingCommas);
import emptyImport from './empty-import'; builtin['empty-import'] = emptyImport; builtins.push(emptyImport);

import {visitors as babelTraverseVisitors} from 'babel-traverse';
export const merge = babelTraverseVisitors.merge;

export function load(visitors = []) {
  if (visitors === '*') {
    return [...builtins];
  }
  let loaded = [];
  for (let visitor of (visitors: Array)) {
    if (typeof visitor === 'string') {
      if (visitors === '*') {
        loaded.push(...builtins);
        continue;
      }
      visitor = builtin[visitor];
    }
    loaded.push(visitor);
  }
  return loaded;
}
