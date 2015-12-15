// Render by depth-first reference traversal
// TODO: move to standalone package

export default function render(node, path = "") {
  if (node == null) throw new Error("Illegal reference at " + path);
  let lists = {};
  return node.sourceElements.map((el) => {
    if (el.reference) {
      let [key, list] =  el.reference.split('#');
      if (list === "next") {
        let i = lists[key] || 0;
        lists[key] = i + 1;
        if (el.element) {
          return el.value || node[el.reference];
        } else {
          return render(node[key][i], path + '.' + key + '[' + i + ']');
        }
      } else {
        if (el.element) {
          return el.value || node[el.reference];
        } else {
          return render(node[key], path + '.' + key);
        }
      }
    } else if (el.element !== "EOF") {
      return el.value;
    }
  }).join("");
}
