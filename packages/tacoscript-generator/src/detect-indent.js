// use detect-indent package to detect the indent we should use, and fall back
// to a sensible default.

// TODO: allow reading indent from directives.

import detectIndent from "detect-indent";

export default function (code) {
  let indent = detectIndent(code);
  if (!indent.type || indent.amount === 1 && indent.type === 'space') {
    indent = {amount: 2, type: 'space', indent: '  '};
  }
  return indent;
}
