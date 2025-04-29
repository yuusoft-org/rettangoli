import esbuild from "esbuild";
import httpPlugin from "esbuild-plugin-http";

["iife-layout"].forEach((mode) => {
  esbuild
    .build({
      bundle: true,
      plugins: mode === "esm" ? [] : [httpPlugin],
      minify: true,
      sourcemap: false,
      format: mode === "esm" ? "esm" : "iife",
      globalName: "rettangoli",
      outfile: `./viz/static/public/rettangoli.js`,
      entryPoints: [`src/entry-${mode}.js`],
    })
    .catch(() => process.exit(1));
});
