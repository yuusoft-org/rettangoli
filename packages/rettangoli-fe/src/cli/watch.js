import path from "node:path";

import { createServer } from "vite";

import {
  RETTANGOLI_FE_VIRTUAL_ENTRY_ID,
  createRettangoliFeVitePlugin,
} from "./vitePlugin.js";

const toPosixPath = (value) => value.split(path.sep).join("/");

export const resolveServeContext = ({ cwd, outfile }) => {
  const resolvedOutfile = path.resolve(cwd, outfile);
  const relativeOutfile = path.relative(cwd, resolvedOutfile);
  const parts = relativeOutfile.split(path.sep).filter(Boolean);
  const staticIndex = parts.indexOf("static");

  if (staticIndex >= 0) {
    const rootParts = parts.slice(0, staticIndex);
    const root = path.resolve(cwd, ...rootParts);
    const publicEntryPath = `/${toPosixPath(parts.slice(staticIndex).join(path.sep))}`;
    return {
      root,
      publicEntryPath,
    };
  }

  const outDir = path.dirname(resolvedOutfile);
  const root = path.dirname(outDir);
  const publicEntryPath = `/${toPosixPath(path.relative(root, resolvedOutfile))}`;

  return {
    root,
    publicEntryPath,
  };
};

export const createWatchServer = async (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = ["src"],
    port = 3001,
    outfile = "./vt/static/main.js",
    setup = "setup.js",
    i18n = null,
    publicDir,
  } = options;

  const { root, publicEntryPath } = resolveServeContext({ cwd, outfile });
  const resolvedPublicDir =
    typeof publicDir === "string" && publicDir.length > 0
      ? path.resolve(cwd, publicDir)
      : publicDir;

  const server = await createServer({
    clearScreen: false,
    configFile: false,
    publicDir: resolvedPublicDir,
    root,
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
    },
    plugins: [
      createRettangoliFeVitePlugin({
        cwd,
        dirs,
        setup,
        i18n,
        errorPrefix: "[Watch]",
        publicEntryPath,
      }),
    ],
  });

  return server;
};

const startWatching = async (options = {}) => {
  const {
    cwd = process.cwd(),
    outfile = "./vt/static/main.js",
    enableCliShortcuts = !!process.stdin.isTTY,
  } = options;
  const { root, publicEntryPath } = resolveServeContext({ cwd, outfile });

  console.log(`[Watch] Root: ${root}`);
  console.log(`[Watch] Entry: ${publicEntryPath}`);

  try {
    const server = await createWatchServer(options);
    await server.listen();
    await server.transformRequest(RETTANGOLI_FE_VIRTUAL_ENTRY_ID);
    server.printUrls();
    if (enableCliShortcuts) {
      server.bindCLIShortcuts({ print: true });
    }
    return server;
  } catch (error) {
    console.error("Error during Vite server startup:", error);
    process.exit(1);
  }
};

export default startWatching;
