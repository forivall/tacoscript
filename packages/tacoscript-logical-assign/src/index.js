import horchata from "horchata";
import * as parserPlugin from "./horchata/parser";
import * as lexerPlugin from "./horchata/lexer";

horchata.registerPluginModule("logical-assign", parserPlugin, lexerPlugin);

import * as t from "comal-types";
export default function () {
  return {
    visitor: {
      AssignmentExpression(path) {
        if (path.node.type === "&&=" || path.node.type === "||=") {
          // TODO
          // replace with logicalExpression(left, path.node.type.slice(0, -1), assignmentExpression(left, right))
          // TODO: also cache accessor, e.g.
          // a.b.c ||= d
          // =>
          // const a_b = a.b
          // (a_b.c || (a_b.c = d));
          // TODO: if in expressionStatement, use ifStatement instead
          // x ||= y
          // =>
          // if (!x) x = y
          // ---
          // foo = (x ||= y)
          // =>
          // foo = (x || (x = y))
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
