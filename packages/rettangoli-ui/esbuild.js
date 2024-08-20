
import esbuild from "esbuild";
import httpPlugin from "esbuild-plugin-http";

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
