import path from "node:path";

import { createServer } from "vite";

import {
  RETTANGOLI_FE_VIRTUAL_ENTRY_ID,
  createRettangoliFeVitePlugin,
} from "./vitePlugin.js";

const toPosixPath = (value) => value.split(path.sep).join("/");

const toViteFsPath = (value) => {
  const normalized = toPosixPath(path.resolve(value));
  return normalized.startsWith("/") ? `/@fs${normalized}` : `/@fs/${normalized}`;
};

export const resolveWatchEntryId = ({ cwd, watchEntry }) =>
  typeof watchEntry === "string" && watchEntry.length > 0
    ? toViteFsPath(path.resolve(cwd, watchEntry))
    : RETTANGOLI_FE_VIRTUAL_ENTRY_ID;

export const resolveServeContext = ({
  cwd,
  outfile = "./vt/static/main.js",
}) => {
  const resolvedOutfile = path.resolve(cwd, outfile);
  const relativeOutfile = path.relative(cwd, resolvedOutfile);
  const parts = relativeOutfile.split(path.sep).filter(Boolean);
  const staticIndex = parts.indexOf("static");

  if (staticIndex >= 0) {
    const rootParts = parts.slice(0, staticIndex);
    const root = path.resolve(cwd, ...rootParts);
    const publicEntryPath = `/${toPosixPath(parts.slice(staticIndex + 1).join(path.sep))}`;
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
    watchEntry,
    vitePlugins = [],
  } = options;

  const { root, publicEntryPath } = resolveServeContext({ cwd, outfile });
  const resolvedPublicDir =
    typeof publicDir === "string" && publicDir.length > 0
      ? path.resolve(cwd, publicDir)
      : publicDir;
  const servedEntryId = resolveWatchEntryId({ cwd, watchEntry });

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
        servedEntryId,
      }),
      ...vitePlugins,
    ],
  });

  return server;
};

const startWatching = async (options = {}) => {
  const {
    cwd = process.cwd(),
    outfile = "./vt/static/main.js",
    watchEntry,
    enableCliShortcuts = !!process.stdin.isTTY,
  } = options;
  const { root, publicEntryPath } = resolveServeContext({ cwd, outfile });
  const servedEntryId = resolveWatchEntryId({ cwd, watchEntry });

  console.log(`[Watch] Root: ${root}`);
  console.log(`[Watch] Entry: ${publicEntryPath}`);
  if (watchEntry) {
    console.log(`[Watch] Source: ${path.resolve(cwd, watchEntry)}`);
  }

  try {
    const server = await createWatchServer(options);
    await server.listen();
    await server.transformRequest(servedEntryId);
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
