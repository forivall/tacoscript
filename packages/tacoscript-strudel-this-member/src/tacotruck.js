export function ThisMemberExpression(node) {
  this.push("@");
  this.print(node, "property");
}
