import path from "node:path";

import { getAllFiles } from "../commonBuild.js";
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

const resolveModuleFilePath = (module) => {
  const value = module?.file || module?.id;
  if (typeof value !== "string" || value.startsWith("\0")) {
    return null;
  }

  const cleanValue = value.split(/[?#]/, 1)[0];
  const filePath = cleanValue.startsWith("/@fs/")
    ? cleanValue.slice("/@fs".length)
    : cleanValue;
  return path.isAbsolute(filePath) ? path.resolve(filePath) : null;
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
  servedEntryId = RETTANGOLI_FE_VIRTUAL_ENTRY_ID,
} = {}) => {
  const resolvedDirs = dirs.map((directory) => path.resolve(cwd, directory));
  const resolvedSetup = path.resolve(cwd, setup);
  const normalizedPublicEntryPath = normalizePublicEntryPath(publicEntryPath);
  const i18nContext = loadI18nBuildContext({ cwd, i18n, errorPrefix });

  let currentCommand = "build";
  let devServer = null;

  const getComponentFilePaths = () => {
    return getAllFiles(resolvedDirs)
      .filter((filePath) => isSupportedComponentFile(filePath));
  };

  const getEntryWatchPaths = ({ includeDirectories = false } = {}) => {
    const i18nWatchPaths = includeDirectories
      ? getI18nWatchPaths({ i18nContext })
      : Object.values(i18nContext.localeFiles || {});

    return [
      ...(includeDirectories ? resolvedDirs : []),
      resolvedSetup,
      ...getComponentFilePaths(),
      ...i18nWatchPaths,
    ];
  };

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

  const invalidateVirtualEntry = ({ timestamp } = {}) => {
    if (!devServer) {
      return null;
    }
    const module = devServer.moduleGraph.getModuleById(
      RESOLVED_VIRTUAL_ENTRY_ID,
    );
    if (module) {
      devServer.moduleGraph.invalidateModule(
        module,
        new Set(),
        timestamp,
        true,
      );
    }
    return module || null;
  };

  const triggerFullReload = ({ timestamp } = {}) => {
    if (!devServer) {
      return;
    }
    invalidateVirtualEntry({ timestamp });
    devServer.ws.send({ type: "full-reload" });
  };

  const requiresFullReload = (filePath) => {
    const resolvedFilePath = path.resolve(filePath);
    return resolvedFilePath === resolvedSetup;
  };

  const reachesSetupModule = (context) => {
    const pending = [...(context.modules || [])];
    const graphModules = devServer?.moduleGraph?.getModulesByFile?.(
      path.resolve(context.file),
    );
    if (graphModules) {
      pending.push(...graphModules);
    }

    const visited = new Set();
    while (pending.length > 0) {
      const module = pending.pop();
      if (!module || visited.has(module)) {
        continue;
      }
      visited.add(module);

      if (resolveModuleFilePath(module) === resolvedSetup) {
        return true;
      }
      if (module.importers && typeof module.importers[Symbol.iterator] === "function") {
        pending.push(...module.importers);
      }
    }

    return false;
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

      for (const filePath of getEntryWatchPaths()) {
        if (typeof this.addWatchFile === "function") {
          this.addWatchFile(filePath);
        }
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
      server.watcher.add(getEntryWatchPaths({ includeDirectories: true }));

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
              servedEntryId,
            );

            if (!transformed) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "text/plain; charset=utf-8");
              res.end(
                `Failed to transform ${servedEntryId}.`,
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
      if (requiresFullReload(context.file) || reachesSetupModule(context)) {
        triggerFullReload({ timestamp: context.timestamp });
        return [];
      }

      if (!isTrackedFilePath(context.file)) {
        return;
      }

      const virtualEntryModule = invalidateVirtualEntry({
        timestamp: context.timestamp,
      });
      return [
        ...(context.modules || []),
        ...(virtualEntryModule ? [virtualEntryModule] : []),
      ].filter((module, index, modules) => modules.indexOf(module) === index);
    },
  };
};
