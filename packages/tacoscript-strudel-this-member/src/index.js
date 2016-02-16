
// Warning: the plugin signature may change significantly before 1.0

// TODO: since this is native to horchata, this will be moved inside of comal-types
// (it was needed here as a proof of concept for defining custom types)
import {defineType} from "comal-types";
defineType("ThisMemberExpression", {
  builder: ["property"],
  visitor: ["property"],
  aliases: ["Expression", "LVal"],
  fields: {
    property: {
      validate(node, key, val) {
        defineType.assertNodeType("Identifier")(node, key, val);
      }
    }
  }
});

import * as t from "comal-types";
export default function () {
  return {
    visitor: {
      ThisMemberExpression(path) {
        path.replaceWith(
          t.memberExpression(t.thisExpression(), path.node.property, false)
        );
      }
    },
    manipulateOptions(opts, parserOpts, transformation) {
      const parser = transformation.parser;
      if (parser && parser.name === "horchata") {
        parserOpts.features.strudelThisMember = true;
      }
    }
  };
}

export function transpose() {
  return {
    visitor: {
      MemberExpression(path) {
        if (!path.node.computed && t.isThisExpression(path.node.object)) {
          path.replaceWith(t.thisMemberExpression(path.node.property));
        }
      }
    },
  };
}

export * as tacotruck from "./tacotruck";
