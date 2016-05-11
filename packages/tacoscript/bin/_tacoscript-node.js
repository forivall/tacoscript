#!/usr/bin/env node

require("../lib/cli/commands/_node").default({}, process.argv.slice(2), function(code) {
  if (typeof code === "number" && code !== 0) process.exit(code);
});
