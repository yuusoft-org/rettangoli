const esbuild = require("esbuild");
const httpPlugin = require("esbuild-plugin-http");

esbuild
  .build({
    bundle: true,
    plugins: [httpPlugin],
    minify: true,
    sourcemap: true,
    format: "iife",
    globalName: "rettangoliUi",
    outfile: "dist/rettangoli-ui.min.js",
    entryPoints: ["src/index.js"],
  })
  .catch(() => process.exit(1));
