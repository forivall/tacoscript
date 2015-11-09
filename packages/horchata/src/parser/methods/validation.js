
// To be overridden by plugins
// equivalent to "toReferencedList" in babylon, used by flow plugin
export function checkReferencedList(expressions) { return expressions; }

// equivalent to "checkLVal" in babylon & acorn
// will be used by a validator plugin
export function checkAssignable(node, assignableContext = {}) {}
