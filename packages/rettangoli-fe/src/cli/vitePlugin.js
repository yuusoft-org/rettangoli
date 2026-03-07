import path from "node:path";

import { isSupportedComponentFile } from "./contracts.js";
import { generateFrontendEntrySource } from "./frontendEntrySource.js";

export const RETTANGOLI_FE_VIRTUAL_ENTRY_ID = "virtual:rettangoli-fe-entry";
const RESOLVED_VIRTUAL_ENTRY_ID = `\0${RETTANGOLI_FE_VIRTUAL_ENTRY_ID}`;

const isWithinDirectory = ({ filePath, directoryPath }) => {
  const relativePath = path.relative(directoryPath, filePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
};

const normalizePublicEntryPath = (value) => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

export const createRettangoliFeVitePlugin = ({
  cwd = process.cwd(),
  dirs = ["./example"],
  setup = "setup.js",
  errorPrefix = "[Build]",
  publicEntryPath = null,
} = {}) => {
  const resolvedDirs = dirs.map((directory) => path.resolve(cwd, directory));
  const resolvedSetup = path.resolve(cwd, setup);
  const normalizedPublicEntryPath = normalizePublicEntryPath(publicEntryPath);

  let currentCommand = "build";
  let devServer = null;

  const isTrackedFilePath = (value) => {
    const filePath = path.resolve(value);
    if (filePath === resolvedSetup) {
      return true;
    }

    if (!isSupportedComponentFile(filePath)) {
      return false;
    }

    return resolvedDirs.some((directoryPath) =>
      isWithinDirectory({ filePath, directoryPath }),
    );
  };

  const invalidateVirtualEntry = () => {
    if (!devServer) {
      return;
    }
    const module = devServer.moduleGraph.getModuleById(
      RESOLVED_VIRTUAL_ENTRY_ID,
    );
    if (module) {
      devServer.moduleGraph.invalidateModule(module);
    }
  };

  const triggerFullReload = () => {
    if (!devServer) {
      return;
    }
    invalidateVirtualEntry();
    devServer.ws.send({ type: "full-reload" });
  };

  return {
    name: "rettangoli-fe",
    enforce: "pre",
    configResolved(config) {
      currentCommand = config.command;
    },
    resolveId(id) {
      if (id === RETTANGOLI_FE_VIRTUAL_ENTRY_ID) {
        return RESOLVED_VIRTUAL_ENTRY_ID;
      }
      return null;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_ENTRY_ID) {
        return null;
      }
      return generateFrontendEntrySource({
        cwd,
        dirs,
        setup,
        command: currentCommand,
        errorPrefix,
      });
    },
    configureServer(server) {
      devServer = server;

      const onAdd = (filePath) => {
        if (isTrackedFilePath(filePath)) {
          triggerFullReload();
        }
      };

      const onUnlink = (filePath) => {
        if (isTrackedFilePath(filePath)) {
          triggerFullReload();
        }
      };

      server.watcher.on("add", onAdd);
      server.watcher.on("unlink", onUnlink);

      if (normalizedPublicEntryPath) {
        server.middlewares.use(async (req, res, next) => {
          const reqPath = (req.url || "").split("?")[0];
          if (reqPath !== normalizedPublicEntryPath) {
            next();
            return;
          }

          try {
            const transformed = await server.transformRequest(
              RETTANGOLI_FE_VIRTUAL_ENTRY_ID,
            );

            if (!transformed) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "text/plain; charset=utf-8");
              res.end(
                `Failed to transform ${RETTANGOLI_FE_VIRTUAL_ENTRY_ID}.`,
              );
              return;
            }

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/javascript");
            res.end(transformed.code);
          } catch (error) {
            server.ssrFixStacktrace(error);
            res.statusCode = 500;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(error.stack || String(error));
          }
        });
      }
    },
    handleHotUpdate(context) {
      if (!isTrackedFilePath(context.file)) {
        return;
      }
      triggerFullReload();
      return [];
    },
  };
};
