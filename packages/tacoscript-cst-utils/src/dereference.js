export default function dereference(parent, childReference, state) {
  if (childReference === undefined) return undefined;
  let [key, list] = childReference.reference.split('#');
  let node;
  if (list === "next") {
    let i = state.list[key] || 0;
    node = parent[key][i];
    state.list[key] = i + 1;
  } else {
    node = parent[key];
  }
  return node;
}
