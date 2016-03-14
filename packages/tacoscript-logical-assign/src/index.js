import * as horchata from "horchata";
import * as parserPlugin from "./horchata/parser";
import * as lexerPlugin from "./horchata/lexer";

horchata.registerPluginModule("logical-assign", parserPlugin, lexerPlugin);

// helpers required:
//   cache value
//     find nearest statement location

// TODO: document comal-traverse (and babel-traverse) thoroughly

export default function ({types: t}) {
  return {
    visitor: {
      AssignmentExpression(path) {
        const node = path.node;
        const op = node.operator;
        if (op === "&&=" || op === "||=") {
          const {left, right, extra = {}} = path.node;
          if (!extra.parenthesized && t.isExpressionStatement(path.parentPath.node)) {
            const test = op === "&&=" ? left : t.unaryExpression("!", left, true);
            path.parentPath.replaceWith(t.ifStatement(test, t.expressionStatement(t.assignmentExpression('=', left, right))));
          } else {
            path.replaceWith(t.logicalExpression(op.slice(0, -1), left, t.assignmentExpression('=', left, right)));
          }
          // path.insertBefore(t.constDecl)
          // TODO: also cache accessor, e.g.
          // a.b.c ||= d
          // =>
          // const a_b = a.b
          // (a_b.c || (a_b.c = d));
        }
      }
    },
    manipulateOptions(opts, parserOpts, transformation) {
      const parser = transformation.parser;
      if (parser && parser.name === "horchata") {
        parserOpts.plugins["logical-assign"] = true;
      }
    }
  };
}

export function transpose({types: t}) {
  return {
    visitor: {
      LogicalExpression(path) {
        const {node} = path;
        if (node.operator !== "&&" && node.operator !== "||") return;
        // TODO: create a "node equals" for comal-types
        if (t.isAssignmentExpression(node.right)) {
          const outerLeft = node.left;
          const innerLeft = node.right.left;
          // TODO: generic case, not just identifier
          if (
            t.isIdentifier(outerLeft) && t.isIdentifier(innerLeft) &&
            outerLeft.name === innerLeft.name
          ) {
            path.replaceWith(t.assignmentExpression(node.operator + "=", node.left, node.right.right));
          }
        }
      }
    },
  };
}

export * as tacotruck from "./tacotruck";
