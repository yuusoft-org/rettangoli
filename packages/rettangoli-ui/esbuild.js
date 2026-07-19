import esbuild from "esbuild";

const builds = [
  {
    name: "esm",
    entryPoint: "src/index.js",
    format: "esm",
  },
  {
    name: "iife-ui",
    entryPoint: "src/entry-iife-ui.js",
    format: "iife",
  },
  {
    name: "iife-layout",
    entryPoint: "src/entry-iife-layout.js",
    format: "iife",
  },
];

for (const build of builds) {
  try {
    await esbuild.build({
      bundle: true,
      minify: true,
      sourcemap: false,
      platform: "browser",
      format: build.format,
      ...(build.format === "iife" ? { globalName: "rettangoli" } : {}),
      outfile: `./dist/rettangoli-${build.name}.min.js`,
      entryPoints: [build.entryPoint],
    });
    console.log(`${build.name} build successful`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
