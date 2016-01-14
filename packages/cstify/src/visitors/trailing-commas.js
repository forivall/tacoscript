import {addExtra} from '../helpers';

export default {
  'CallExpression|NewExpression'({node}) {
    // arguments
  },
  'Method'({node}) {
    // params
  },
  'ArrowFunctionExpression'({node}) {
    // params
  },
  'FunctionDeclaration|FunctionExpression'({node}) {
    // params
  },
  'ArrayExpression|ArrayPattern'({node}) {
    // elements
  },
  'ObjectExpression|ObjectPattern'({node}) {
    // properties
  },
  'ImportDeclaration'({node}) {
    // specifiers
  },
  'ExportNamedDeclaration'({node}) {
    // specifiers
  }
}
