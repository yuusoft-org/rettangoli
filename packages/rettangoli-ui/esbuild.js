
import esbuild from "esbuild";
import httpPlugin from "esbuild-plugin-http";

['esm', 'iife-ui', 'iife-layout'].forEach(mode => {
  esbuild
    .build({
      bundle: true,
    plugins: mode === 'esm' ? [] : [httpPlugin],
    minify: true,
    sourcemap: false,
    format: mode === 'esm' ? "esm" : "iife",
    globalName: "rettangoli",
    outfile: `dist/rettangoli-${mode}.min.js`,
      entryPoints: [`src/entry-${mode}.js`],
    })
    .catch(() => process.exit(1));
});
