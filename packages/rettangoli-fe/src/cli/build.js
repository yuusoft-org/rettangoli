import path from "node:path";

import { build as viteBuild } from "vite";

import {
  RETTANGOLI_FE_VIRTUAL_ENTRY_ID,
  createRettangoliFeVitePlugin,
} from "./vitePlugin.js";

const buildRettangoliFrontend = async (options = {}) => {
  console.log("running build with options", options);

  const {
    cwd = process.cwd(),
    dirs = ["./example"],
    outfile = "./vt/static/main.js",
    setup = "setup.js",
    development = false,
  } = options;

  const resolvedOutfile = path.resolve(cwd, outfile);
  const outDir = path.dirname(resolvedOutfile);
  const outFileName = path.basename(resolvedOutfile);
  const relativeOutDir = path.relative(cwd, outDir) || ".";

  await viteBuild({
    configFile: false,
    root: cwd,
    plugins: [
      createRettangoliFeVitePlugin({
        cwd,
        dirs,
        setup,
        errorPrefix: "[Build]",
      }),
    ],
    build: {
      outDir: relativeOutDir,
      emptyOutDir: false,
      minify: development ? false : "esbuild",
      sourcemap: !!development,
      target: "esnext",
      rollupOptions: {
        input: RETTANGOLI_FE_VIRTUAL_ENTRY_ID,
        output: {
          format: "es",
          entryFileNames: outFileName,
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  });

  console.log(`Build complete. Output file: ${resolvedOutfile}`);
};

export default buildRettangoliFrontend;
