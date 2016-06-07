#!/usr/bin/env node

// try { require('source-map-support').install(); } catch (e) {}

require("../lib/cli").default(process.argv.slice(2), process.exit);
