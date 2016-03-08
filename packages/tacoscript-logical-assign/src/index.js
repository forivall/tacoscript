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
      ExpressionStatement(path) {
        const node = path.node.expression;
        if (t.isAssignmentExpression(node)) {
          const {left, right, operator: op, extra} = node;
          if (op === "&&=" || op === "||=") {
            if (extra == null || !extra.parenthesized) {
              let test = op === "&&=" ? left : t.unaryExpression("!", left, true);
              path.replaceWith(t.ifStatement(test, t.expressionStatement(t.assignmentExpression('=', left, right))));
            }
          }
        }
      },
      AssignmentExpression(path) {
        const node = path.node;
        const op = node.operator;
        if (op === "&&=" || op === "||=") {
          const {left, right} = path.node;
          path.replaceWith(t.logicalExpression(op.slice(0, -1), left, t.assignmentExpression('=', left, right)));
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

export function transpose() {
  return {
    visitor: {
      LogicalExpression(path) {
        // check that the contents that
      }
    },
  };
}

export * as tacotruck from "./tacotruck";
