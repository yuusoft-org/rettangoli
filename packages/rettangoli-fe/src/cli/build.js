import path from "node:path";
import { performance } from "node:perf_hooks";

import { build as viteBuild } from "vite";

import {
  RETTANGOLI_FE_VIRTUAL_ENTRY_ID,
  createRettangoliFeVitePlugin,
} from "./vitePlugin.js";
import { emitI18nAssets, loadI18nBuildContext } from "./i18nBuild.js";

const buildRettangoliFrontend = async (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = ["./example"],
    outfile = "./vt/static/main.js",
    setup = "setup.js",
    development = false,
    i18n = null,
  } = options;

  const resolvedOutfile = path.resolve(cwd, outfile);
  const outDir = path.dirname(resolvedOutfile);
  const outFileName = path.basename(resolvedOutfile);
  const relativeOutDir = path.relative(cwd, outDir) || ".";
  const i18nContext = loadI18nBuildContext({
    cwd,
    i18n,
    errorPrefix: "[Build]",
  });
  const startedAt = performance.now();

  console.log(`[Build] Building ${resolvedOutfile}...`);

  await viteBuild({
    configFile: false,
    clearScreen: false,
    logLevel: "warn",
    root: cwd,
    plugins: [
      createRettangoliFeVitePlugin({
        cwd,
        dirs,
        setup,
        i18n,
        errorPrefix: "[Build]",
      }),
    ],
    build: {
      outDir: relativeOutDir,
      emptyOutDir: false,
      minify: development ? false : "oxc",
      sourcemap: false,
      target: "esnext",
      reportCompressedSize: false,
      rolldownOptions: {
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

  emitI18nAssets({ outDir, i18nContext });

  const durationMs = Math.round(performance.now() - startedAt);
  console.log(`[Build] Complete in ${durationMs}ms.`);
};

export default buildRettangoliFrontend;
