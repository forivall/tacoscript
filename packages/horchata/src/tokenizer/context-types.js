
export class TokContext {
  constructor(token, isExpr, preserveSpace, override) {
    this.token = token;
    this.isExpr = !!isExpr;
    this.preserveSpace = !!preserveSpace;
    this.override = override;
  }
}

// TODO: document context types and reason(s) for needing a new context for each
export const types = {
  stmt: new TokContext("statement", false),
  decl_expr: new TokContext("var", true),
  return_expr: new TokContext("return", true),
  obj_expr: new TokContext("{", true),
  tmpl_expr: new TokContext("${", true),
  // implicit parenthises for keyword block starters
  stmt_head: new TokContext("keyword", false),
  paren_expr: new TokContext("(", true),
  tmpl_str: new TokContext("`", true, true, (lexer) => lexer.readTmplToken()),
  func_expr: new TokContext("function", true),
  // for a list of expressions
  // * arguments for a function definition
  // * arguments for a function call
  // * continuation of a if/for/while statement
  // l_expr: new TokContext("list", true),
  // *** for now, require use of escaped newlines, like python
}
