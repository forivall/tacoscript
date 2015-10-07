
const printer = {
  generate(ast) {
    this.print(ast);
    let code = this.stringify();

    return {
      code: code,
      tokens: this.tokens,
      map: this.map.generate()
    }
  }
};
export default printer;

import * as _base from "./generators/base";
// import * as _jsx from "./generators/jsx";
// import * as _flow from "./generators/flow";
// import * as _modules from "./generators/modules";
// import * as _templateLiterals from "./generators/templateLiterals";
// NOTE: these are only the types with shared syntax. Arrays literals, object
// literals, and possibly regex types will have minor differences
import * as _types from "./generators/simpleTypes";

for (let generator of [_base, _types]) {
  Object.assign(printer, generator);
}
