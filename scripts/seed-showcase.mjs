import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "node",
});

require("ts-node/register/transpile-only");
require("./seed-showcase.ts");
