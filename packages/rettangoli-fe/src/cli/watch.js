import path from "node:path";

import { createServer } from "vite";

import { createRettangoliFeVitePlugin } from "./vitePlugin.js";

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
  } = options;

  const { root, publicEntryPath } = resolveServeContext({ cwd, outfile });

  const server = await createServer({
    configFile: false,
    root,
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
    plugins: [
      createRettangoliFeVitePlugin({
        cwd,
        dirs,
        setup,
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

  console.log("watch root dir:", root);
  console.log("watch entry path:", publicEntryPath);

  try {
    const server = await createWatchServer(options);
    await server.listen();
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
