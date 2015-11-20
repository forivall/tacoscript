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

export function checkFunctionBody(node) {
  // the following is from babylon.

  // If this is a strict mode function, verify that argument names
  // are not repeated, and it does not try to bind the words `eval`
  // or `arguments`.
  let checkLVal = this.state.strict;
  let checkLValStrict = false;
  let isStrict = false;

  // normal function
  if (node.body.directives.length) {
    for (let directive of (node.body.directives: Array<Object>)) {
      if (directive.value.value === "use strict") {
        isStrict = true;
        checkLVal = true;
        checkLValStrict = true;
        break;
      }
    }
  }

  //
  if (isStrict && node.id && node.id.type === "Identifier" && node.id.name === "yield") {
    this.raise(node.id.start, "Binding yield in strict mode");
  }

  if (checkLVal) {
    this.checkFunctionAssignable(node, checkLValStrict);
  }
}

export function checkArrowExpressionFunction(node) {
  this.checkFunctionAssignable(node);
}

export function checkFunctionAssignable(node, setStrict) {
  let nameHash = Object.create(null);
  let oldStrict = this.state.strict;
  if (setStrict) this.state.strict = true;
  if (node.id) {
    this.checkAssignable(node.id, {isBinding: true});
  }
  for (let param of (node.params: Array<Object>)) {
    this.checkAssignable(param, {isBinding: true, checkClashes: nameHash});
  }
  this.state.strict = oldStrict;
}

export function checkIdentifierName(identifierContext) {
  const allowKeywords = !!identifierContext.allowKeywords;
  // TODO: see if this still triggers with escaped words in
  if (!allowKeywords && !this.state.containsEsc && (this.state.strict ? this.reservedWordsStrict : this.reservedWords).test(this.state.cur.value.value)) {
    this.raise(this.state.cur.start, "The keyword '" + this.state.cur.value.value + "' is reserved");
  }
}

export function checkMetaProperty(node) {
  if (this.state.inFunction) {
    this.raise(node.start, "new.target can only be used in functions");
  }
}

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

export function checkParams(node) {
  let nameHash = {};
  for (let i = 0; i < node.params.length; i++) {
    this.checkAssignable(node.params[i], true, nameHash);
  }
}

export function checkUnaryExpression(node) {
  return;
  // TODO: move to plugin
  if (this.state.strict && node.operator === "delete" &&
      node.argument.type === "Identifier") {
    this.raise(node.start, "Deleting local variable in strict mode");
  }
}
