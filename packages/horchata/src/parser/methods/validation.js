import { types as tt } from "../../tokenizer/types";

// To be overridden by plugins
// equivalent to "toReferencedList" in babylon, used by flow plugin
export function checkReferencedList(expressions) { return expressions; }

// equivalent to "checkLVal"
// will be used by a validator plugin
export function checkAssignable(/*node, assignableContext = {}*/) {}

export function checkDeclaration(decl, kind, declarationContext) {
  if (!decl.init) {
    const isFor = !!declarationContext.isFor;
    if (kind === tt._const && !this.matchForKeyword()) {
      // const requires an initializer or use in `for ... in` or `for ... of`
      this.unexpected();
    } else if (decl.id.type !== "Identifier" && !(isFor && this.matchForKeyword())) {
      this.raise(this.state.prev.end, "Complex binding patterns require an initialization value");
    }
  }
  return decl;
}

export function checkDecorators() {
  // TODO
  // checks are moved to other functions, so that plugins can override them for extended syntax.
  // i.e. allow adding decorators to standalone functions
  // let allowExport = this.state.statementAllowed
}

export function checkExpressionOperatorLeft(node) {
  let left = node.left;

  if (node.operator === "**" && left.type === "UnaryExpression" && left.extra && !left.extra.parenthesizedArgument) {
    this.raise(left.argument.start, "Illegal expression. Wrap left hand side or entire exponentiation in parentheses.");
  }
}

export function checkIdentifierName(identifierContext) {
  const allowKeywords = !!identifierContext.allowKeywords;
  // TODO: see if this still triggers with escaped words in
  if (!allowKeywords && !this.state.containsEsc && (this.state.strict ? this.reservedWordsStrict : this.reservedWords).test(this.state.cur.value.value)) {
    this.raise(this.state.cur.start, "The keyword '" + this.state.cur.value.value + "' is reserved");
  }
}

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

export function checkParams(node) {
  let nameHash = {};
  for (let i = 0; i < node.params.length; i++) {
    this.checkLVal(node.params[i], true, nameHash);
  }
}

export function checkFunctionBody(node, functionContext) {
  const {isArrowFunction} = functionContext;
  let isExpression = isArrowFunction && !this.match(tt._indent) || functionContext.isExpression;

  // If this is a strict mode function, verify that argument names
  // are not repeated, and it does not try to bind the words `eval`
  // or `arguments`.
  if (this.strict || !isExpression && node.body.body.length && this.isUseStrict(node.body.body[0])) {
    let oldStrict = this.strict
    this.strict = true
    if (node.id)
      this.checkLVal(node.id, true)
    this.checkParams(node);
    this.strict = oldStrict
  } else if (isArrowFunction) {
    this.checkParams(node);
  }
}
