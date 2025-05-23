import esbuild from "esbuild";

for (const mode of ["iife-ui", "iife-layout"]) {
  try {
    await esbuild.build({
      bundle: true,
      minify: true,
      sourcemap: false,
      format: mode === "esm" ? "esm" : "iife",
      globalName: "rettangoli",
      outfile: `./dist/rettangoli-${mode}.min.js`,
      entryPoints: [`src/entry-${mode}.js`],
    });
    console.log(`${mode} build successful`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
