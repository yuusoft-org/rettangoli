import esbuild from "esbuild";

for (const mode of ["iife-ui"]) {
  try {
    await esbuild.build({
      bundle: true,
      minify: true,
      sourcemap: false,
      format: mode === "esm" ? "esm" : "iife",
      globalName: "rettangoli",
      outfile: `./vt/static/public/main.js`,
      entryPoints: [`src/entry-${mode}.js`],
    });
    console.log(`${mode} build successful`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
