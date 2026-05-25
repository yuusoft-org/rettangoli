import path from "node:path";

import { isSupportedComponentFile } from "./contracts.js";
import { generateFrontendEntrySource } from "./frontendEntrySource.js";
import {
  buildI18nAssets,
  getI18nPublicAssetPath,
  isI18nSourceFilePath,
  loadI18nBuildContext,
} from "./i18nBuild.js";

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

const getI18nWatchPaths = ({ i18nContext }) => {
  if (!i18nContext?.enabled) {
    return [];
  }

  return [
    i18nContext.resolvedDir,
    ...Object.values(i18nContext.localeFiles || {}),
  ].filter(Boolean);
};

export const createRettangoliFeVitePlugin = ({
  cwd = process.cwd(),
  dirs = ["./example"],
  setup = "setup.js",
  i18n = null,
  errorPrefix = "[Build]",
  publicEntryPath = null,
} = {}) => {
  const resolvedDirs = dirs.map((directory) => path.resolve(cwd, directory));
  const resolvedSetup = path.resolve(cwd, setup);
  const normalizedPublicEntryPath = normalizePublicEntryPath(publicEntryPath);
  const i18nContext = loadI18nBuildContext({ cwd, i18n, errorPrefix });

  let currentCommand = "build";
  let devServer = null;

  const isTrackedFilePath = (value) => {
    const filePath = path.resolve(value);
    if (filePath === resolvedSetup) {
      return true;
    }

    if (isI18nSourceFilePath({ filePath, i18nContext })) {
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
        i18n,
        command: currentCommand,
        errorPrefix,
      });
    },
    configureServer(server) {
      devServer = server;
      const i18nWatchPaths = getI18nWatchPaths({ i18nContext });
      if (i18nWatchPaths.length > 0) {
        server.watcher.add(i18nWatchPaths);
      }

      const serveI18nAsset = (req, res, next) => {
        if (!i18nContext.enabled || !normalizedPublicEntryPath) {
          next();
          return;
        }

        const reqPath = (req.url || "").split("?")[0];

        try {
          const currentI18nContext = loadI18nBuildContext({
            cwd,
            i18n,
            errorPrefix,
          });
          const asset = buildI18nAssets({
            i18nContext: currentI18nContext,
          }).find((candidate) => {
            const publicPath = getI18nPublicAssetPath({
              publicEntryPath: normalizedPublicEntryPath,
              relativeFileName: candidate.relativeFileName,
            });
            return reqPath === publicPath;
          });

          if (!asset) {
            next();
            return;
          }

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(asset.content);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(error.stack || String(error));
        }
      };

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
        server.middlewares.use(serveI18nAsset);
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
