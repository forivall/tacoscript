
export function isIdentifierOrStringLiteral(key, name) {
  return (
    key.type === "Identifier" && key.name === name ||
    key.type === "StringLiteral" && key.value === name ||
  false);
}
