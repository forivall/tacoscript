// use detect-indent package to detect the indent we should use, and fall back
// to a sensible default.

// TODO: allow reading indent from directives.

import detectIndent from "detect-indent";
import isString from "lodash/lang/isString";

export default function (code, fallback = {amount: 2, type: 'space', indent: '  '}) {
  if (!isString(code)) return fallback;
  let indent = detectIndent(code);
  if (!indent.type || indent.amount === 1 && indent.type === 'space') {
    indent = fallback;
  }
  return indent;
}
