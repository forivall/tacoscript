/* @flow */

import defineType, {
  assertNodeType,
  assertValueType,
  chain,
  assertEach,
  assertOneOf,
} from "./index";

defineType("AssignmentPattern", {
  visitor: ["left", "right"],
  aliases: ["Pattern", "LVal"],
  fields: {
    left: {
      validate: assertNodeType("Identifier")
    },
    right: {
      validate: assertNodeType("Expression")
    }
  }
});

defineType("ArrayPattern", {
  visitor: ["elements", "typeAnnotation"],
  aliases: ["Pattern", "LVal"],
  fields: {
    elements: {
      validate: chain(assertValueType("array"), assertEach(assertNodeType("Expression")))
    }
  }
});

defineType("ArrowFunctionExpression", {
  builder: ["params", "body", "async"],
  visitor: ["params", "body", "returnType"],
  aliases: ["Scopable", "Function", "BlockParent", "FunctionParent", "Expression", "Pureish"],
  fields: {
    params: {
      validate: chain(assertValueType("array"), assertEach(assertNodeType("LVal")))
    },
    body: {
      validate: assertNodeType("BlockStatement", "Expression")
    },
    async: {
      validate: assertValueType("boolean"),
      default: false
    }
  }
});

defineType("ClassBody", {
  visitor: ["body"],
  fields: {
    body: {
      validate: chain(assertValueType("array"), assertEach(assertNodeType("ClassMethod", "ClassProperty")))
    }
  }
});

defineType("ClassDeclaration", {
  builder: ["id", "superClass", "body", "decorators"],
  visitor: [
    "id",
    "body",
    "superClass",
    "typeParameters",
    "superTypeParameters",
    "implements",
    "decorators"
  ],
  aliases: ["Scopable", "Class", "Statement", "Declaration", "Pureish"],
  fields: {
    id: {
      validate: assertNodeType("Identifier")
    },
    body: {
      validate: assertNodeType("ClassBody")
    },
    superClass: {
      optional: true,
      validate: assertNodeType("Expression")
    },
    decorators: {
      validate: chain(assertValueType("array"), assertEach(assertNodeType("Decorator")))
    }
  }
});

defineType("ClassExpression", {
  inherits: "ClassDeclaration",
  aliases: ["Scopable", "Class", "Expression", "Pureish"],
  fields: {
    id: {
      optional: true,
      validate: assertNodeType("Identifier")
    },
    body: {
      validate: assertNodeType("ClassBody")
    },
    superClass: {
      optional: true,
      validate: assertNodeType("Expression")
    },
    decorators: {
      validate: chain(assertValueType("array"), assertEach(assertNodeType("Decorator")))
    }
  }
});

defineType("ExportAllDeclaration", {
  visitor: ["source"],
  aliases: ["Statement", "Declaration", "ModuleDeclaration", "ExportDeclaration"],
  fields: {
    source: {
      validate: assertNodeType("StringLiteral")
    }
  }
});

defineType("ExportDefaultDeclaration", {
  visitor: ["declaration"],
  aliases: ["Statement", "Declaration", "ModuleDeclaration", "ExportDeclaration"],
  fields: {
    declaration: {
      validate: assertNodeType("FunctionDeclaration", "ClassDeclaration", "Expression")
    }
  }
});

defineType("ExportNamedDeclaration", {
  visitor: ["declaration", "specifiers", "source"],
  aliases: ["Statement", "Declaration", "ModuleDeclaration", "ExportDeclaration"],
  fields: {
    declaration: {
      validate: assertNodeType("Declaration"),
      optional: true
    },
    specifiers: {
      validate: chain(assertValueType("array"), assertEach(assertNodeType("ExportSpecifier")))
    },
    source: {
      validate: assertNodeType("StringLiteral"),
      optional: true
    }
  }
});

defineType("ExportSpecifier", {
  visitor: ["local", "exported"],
  aliases: ["ModuleSpecifier"],
  fields: {
    local: {
      validate: assertNodeType("Identifier")
    },
    imported: {
      validate: assertNodeType("Identifier")
    }
  }
});

defineType("ForOfStatement", {
  visitor: ["left", "right", "body"],
  aliases: ["Scopable", "Statement", "For", "BlockParent", "Loop", "ForXStatement"],
  fields: {
    left: {
      validate: assertNodeType("VariableDeclaration", "LVal")
    },
    right: {
      validate: assertNodeType("Expression")
    },
    body: {
      validate: assertNodeType("Statement")
    }
  }
});

defineType("ImportDeclaration", {
  visitor: ["specifiers", "source"],
  aliases: ["Statement", "Declaration", "ModuleDeclaration"],
  fields: {
    specifiers: {
      validate: chain(assertValueType("array"), assertEach(assertNodeType("ImportSpecifier", "ImportDefaultSpecifier", "ImportNamespaceSpecifier")))
    },
    source: {
      validate: assertNodeType("StringLiteral")
    }
  }
});

defineType("ImportDefaultSpecifier", {
  visitor: ["local"],
  aliases: ["ModuleSpecifier"],
  fields: {
    local: {
      validate: assertNodeType("Identifier")
    }
  }
});

defineType("ImportNamespaceSpecifier", {
  visitor: ["local"],
  aliases: ["ModuleSpecifier"],
  fields: {
    local: {
      validate: assertNodeType("Identifier")
    }
  }
});

defineType("ImportSpecifier", {
  visitor: ["local", "imported"],
  aliases: ["ModuleSpecifier"],
  fields: {
    local: {
      validate: assertNodeType("Identifier")
    },
    imported: {
      validate: assertNodeType("Identifier")
    }
  }
});

defineType("MetaProperty", {
  visitor: ["meta", "property"],
  aliases: ["Expression"],
  fields: {
    // todo: limit to new.target
    meta: {
      validate: assertValueType("string")
    },
    property: {
      validate: assertValueType("string")
    }
  }
});

defineType("ClassMethod", {
  aliases: ["Function", "Scopable", "BlockParent", "FunctionParent", "Method"],
  builder: ["kind", "key", "params", "body", "computed", "static"],
  visitor: ["key", "params", "body", "decorators", "returnType", "typeParameters"],
  fields: {
    kind: {
      validate: chain(assertValueType("string"), assertOneOf("get", "set", "method", "constructor")),
      default: "method"
    },
    computed: {
      default: false,
      validate: assertValueType("boolean")
    },
    static: {
      default: false,
      validate: assertValueType("boolean")
    },
    key: {
      validate(node, key, val) {
        let expectedTypes = node.computed ? ["Expression"] : ["Identifier", "StringLiteral", "NumericLiteral"];
        assertNodeType(...expectedTypes)(node, key, val);
      }
    },
    params: {
      validate: chain(assertValueType("array"), assertEach(assertNodeType("LVal")))
    },
    body: {
      validate: assertNodeType("BlockStatement")
    },
    generator: {
      default: false,
      validate: assertValueType("boolean")
    },
    async: {
      default: false,
      validate: assertValueType("boolean")
    }
  }
});

defineType("ObjectPattern", {
  visitor: ["properties", "typeAnnotation"],
  aliases: ["Pattern", "LVal"],
  fields: {
    properties: {
      validate: chain(assertValueType("array"), assertEach(assertNodeType("RestProperty", "Property")))
    }
  }
});

defineType("SpreadElement", {
  visitor: ["argument"],
  aliases: ["UnaryLike"],
  fields: {
    argument: {
      validate: assertNodeType("Expression")
    }
  }
});

defineType("Super", {
  aliases: ["Expression"]
});

defineType("TaggedTemplateExpression", {
  visitor: ["tag", "quasi"],
  aliases: ["Expression"],
  fields: {
    tag: {
      validate: assertNodeType("Expression")
    },
    quasi: {
      validate: assertNodeType("TemplateLiteral")
    }
  }
});

defineType("TemplateElement", {
  builder: ["value", "tail"],
  fields: {
    value: {
      // todo: flatten `raw` into main node
    },
    tail: {
      validate: assertValueType("boolean"),
      default: false
    }
  }
});

defineType("TemplateLiteral", {
  visitor: ["quasis", "expressions"],
  aliases: ["Expression", "Literal"],
  fields: {
    // todo
  }
});

defineType("YieldExpression", {
  builder: ["argument", "delegate"],
  visitor: ["argument"],
  aliases: ["Expression", "Terminatorless"],
  fields: {
    delegate: {
      validate: assertValueType("boolean"),
      default: false
    },
    argument: {
      optional: true,
      validate: assertNodeType("Expression"),
    }
  }
});
