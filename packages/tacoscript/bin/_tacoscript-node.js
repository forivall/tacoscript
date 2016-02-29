#!/usr/bin/env node

require("../lib/cli/commands/_node")({}, process.argv.slice(2), process.exit);
