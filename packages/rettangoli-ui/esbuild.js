
import esbuild from "esbuild";
import httpPlugin from "esbuild-plugin-http";

const args = process.argv.slice(2);

let mode;
if (!args[0]) {
  console.log('please specify ui or layout');
  process.exit(1);
} else if (args[0] === 'ui') {
  mode = 'ui';
} else if (args[0] === 'layout') {
  mode = 'layout';
} else {
  console.log('please specify ui or layout');
  process.exit(1);
}

esbuild
  .build({
    bundle: true,
    plugins: [httpPlugin],
    minify: true,
    sourcemap: false,
    format: "iife",
    globalName: "rettangoli",
    outfile: `dist/rettangoli-${mode}.min.js`,
    entryPoints: [`src/entry-${mode}.js`],
  })
  .catch(() => process.exit(1));
