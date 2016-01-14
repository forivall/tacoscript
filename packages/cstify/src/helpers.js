
export function addExtra(node, key, val) {
  if (!node) return;

  var extra = node.extra = node.extra || {};
  extra[key] = val;
}
