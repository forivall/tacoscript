#!/usr/bin/env babel-node

import { keywords } from "../tokenizer/types";
import forOwn from "lodash/object/forOwn";
import fs from "fs";

let buf = "export default const toCodeFunctions = {\n";

forOwn(keywords, function(tokType, key) {
  buf += `  _${key}: function() { return "${key}"; },\n`;
});

fs.writeFileSync(__dirname + "/../tokenizer/_keywordSerialization.js", buf + "};\n");
