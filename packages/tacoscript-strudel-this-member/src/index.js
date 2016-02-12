
// Warning: this plugin signature may change significantly before 1.0

// TODO: since this is native to horchata, it should be natively part of comal-types
import {defineType} from "comal-types";
defineType("ThisMemberExpression", {
  builder: ["property", "computed"],
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
export default function (api) {
  return {
    visitor: {
      ThisMemberExpression(path, state) {
        path.replaceWith(
          t.memberExpression(t.thisExpression(), path.node.property, false)
        );
      }
    },
    desugar: {

    },
    manipulateOptions(opts, parserOpts, transformation) {
      const parser = transformation.parser;
      if (parser && parser.name === "horchata") {
        parserOpts.features.strudelThisMember = true;
      }
    },
    // parse
    // generate
  };
}
