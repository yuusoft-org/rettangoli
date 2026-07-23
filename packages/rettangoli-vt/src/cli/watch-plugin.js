import { randomUUID } from "node:crypto";
import {
  createReadStream,
  existsSync,
} from "node:fs";
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import {
  generateHtml,
  generateOverview,
  readYaml,
} from "../common.js";
import { deriveSectionPageKey } from "../section-page-key.js";
import { validateVtConfig } from "../validation.js";

const libraryTemplatesPath = new URL("./templates", import.meta.url).pathname;
const libraryStaticPath = new URL("./static", import.meta.url).pathname;

export const RETTANGOLI_VT_WATCH_EVENT = "rettangoli:vt-watch";
export const RETTANGOLI_VT_WATCH_CLIENT_ID =
  "virtual:rettangoli-vt-watch-client";
const RESOLVED_WATCH_CLIENT_ID = `\0${RETTANGOLI_VT_WATCH_CLIENT_ID}`;
const RETTANGOLI_VT_WATCH_BOUNDARY_ID =
  "virtual:rettangoli-vt-watch-boundary";
const RESOLVED_WATCH_BOUNDARY_ID =
  `\0${RETTANGOLI_VT_WATCH_BOUNDARY_ID}`;
const WATCH_CLIENT_PATH = "/__rettangoli_vt_watch_client__.js";
const WATCH_CLIENT_TAG =
  `<script type="module" data-rtgl-watch-client src="${WATCH_CLIENT_PATH}"></script>`;
const WATCHABLE_SPEC_PATTERN = /\.(?:html?|ya?ml)$/i;
const quietGenerationLogger = {
  error() {},
  log() {},
};

const toPosixPath = (value) => value.split(path.sep).join("/");

const getRequestPathname = (requestUrl) => {
  const rawUrl = String(requestUrl || "/");
  let rawPathname = rawUrl.split(/[?#]/, 1)[0];
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl)) {
    try {
      rawPathname = new URL(rawUrl).pathname;
    } catch {
      return null;
    }
  }
  try {
    const decodedPathname = decodeURIComponent(rawPathname);
    return `/${decodedPathname.replace(/^\/+/, "").replace(/\/{2,}/g, "/")}`;
  } catch {
    return null;
  }
};

const isWithinDirectory = ({ filePath, directoryPath }) => {
  const relativePath = path.relative(directoryPath, filePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
};

const convertToHtmlExtension = (filePath) =>
  filePath.endsWith(".html")
    ? filePath
    : filePath.replace(/\.[^/.]+$/, "") + ".html";

const injectWatchClient = (html) => {
  if (html.includes("data-rtgl-watch-client")) return html;
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${WATCH_CLIENT_TAG}</body>`);
  }
  if (/<\/html\s*>/i.test(html)) {
    return html.replace(/<\/html\s*>/i, `${WATCH_CLIENT_TAG}</html>`);
  }
  return `${html}\n${WATCH_CLIENT_TAG}\n`;
};

const getContentType = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".otf": "font/otf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".ttf": "font/ttf",
    ".wasm": "application/wasm",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  return contentTypes[extension] || "application/octet-stream";
};

const loadWatchContext = async ({
  cwd,
  outputDir = path.join(".rettangoli", "vt", "_site"),
}) => {
  const configPath = path.resolve(cwd, "rettangoli.config.yaml");
  const mainConfig = await readYaml(configPath);
  if (!mainConfig?.vt) {
    throw new Error(
      `Invalid "${configPath}": missing required "vt" section.`,
    );
  }

  const configData = validateVtConfig(mainConfig.vt, configPath);
  const vtPath = path.resolve(cwd, configData.path || "vt");
  const templatesPath = path.join(vtPath, "templates");
  const defaultTemplatePath = existsSync(
    path.join(templatesPath, "default.html"),
  )
    ? path.join(templatesPath, "default.html")
    : path.join(libraryTemplatesPath, "default.html");
  const indexTemplatePath = existsSync(path.join(templatesPath, "index.html"))
    ? path.join(templatesPath, "index.html")
    : path.join(libraryTemplatesPath, "index.html");

  return {
    candidatePath: path.resolve(cwd, outputDir, "candidate"),
    configData,
    configPath,
    defaultTemplatePath,
    indexTemplatePath,
    outputDir: path.resolve(cwd, outputDir),
    specsPath: path.join(vtPath, "specs"),
    templatesPath,
    userStaticPath: path.join(vtPath, "static"),
    vtPath,
  };
};

const copyNonHtmlArtifacts = async (sourceDir, destinationDir) => {
  if (!existsSync(sourceDir)) return;
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      await copyNonHtmlArtifacts(sourcePath, destinationPath);
    } else if (!/\.html?$/i.test(entry.name)) {
      await mkdir(path.dirname(destinationPath), { recursive: true });
      await copyFile(sourcePath, destinationPath);
    }
  }
};

const flattenSections = (sections = []) =>
  sections.flatMap((section) =>
    section.type === "groupLabel" && Array.isArray(section.items)
      ? section.items
      : section.files
        ? [section]
        : []
  );

const isSpecInSection = (relativePath, section) => {
  const fileDirectory = path.normalize(path.dirname(relativePath));
  const sectionPath = path.normalize(section.files);
  return (
    fileDirectory === sectionPath ||
    fileDirectory.startsWith(sectionPath + path.sep)
  );
};

const getAffectedSections = ({ configData, specs }) => {
  const affectedPageKeys = new Set();
  return flattenSections(configData.sections).filter((section) => {
    const isAffected = specs.some(({ relativePath }) =>
      isSpecInSection(relativePath, section)
    );
    if (!isAffected) return false;

    const pageKey = deriveSectionPageKey(section);
    if (affectedPageKeys.has(pageKey)) return false;
    affectedPageKeys.add(pageKey);
    return true;
  });
};

const collectFiles = async (directoryPath) => {
  if (!existsSync(directoryPath)) return [];

  const files = [];
  const entries = await readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }
  return files;
};

const commitStagedOutputs = async (outputs) => {
  const uniqueOutputs = [
    ...new Map(outputs.map((output) => [output.outputPath, output])).values(),
  ];
  const commits = [];

  try {
    for (const { outputPath, stagedOutputPath } of uniqueOutputs) {
      const token = randomUUID();
      const temporaryOutputPath = `${outputPath}.watch-${token}.tmp`;
      const backupOutputPath = `${outputPath}.watch-${token}.backup`;
      await mkdir(path.dirname(outputPath), { recursive: true });
      await copyFile(stagedOutputPath, temporaryOutputPath);
      commits.push({
        backedUp: false,
        backupOutputPath,
        committed: false,
        hadPrevious: existsSync(outputPath),
        outputPath,
        temporaryOutputPath,
      });
    }

    for (const commit of commits) {
      if (commit.hadPrevious) {
        await rename(commit.outputPath, commit.backupOutputPath);
        commit.backedUp = true;
      }
    }
    for (const commit of commits) {
      await rename(commit.temporaryOutputPath, commit.outputPath);
      commit.committed = true;
    }
  } catch (error) {
    for (const commit of commits) {
      if (commit.committed && existsSync(commit.outputPath)) {
        await rm(commit.outputPath, { force: true });
      }
    }
    for (const commit of commits) {
      if (commit.backedUp && existsSync(commit.backupOutputPath)) {
        await rename(commit.backupOutputPath, commit.outputPath);
      }
    }
    throw error;
  } finally {
    await Promise.all(commits.flatMap((commit) => [
      rm(commit.backupOutputPath, { force: true }),
      rm(commit.temporaryOutputPath, { force: true }),
    ]));
  }
};

const createFullStage = async (context) => {
  await mkdir(path.dirname(context.outputDir), { recursive: true });
  const stagePath = await mkdtemp(
    path.join(
      path.dirname(context.outputDir),
      `.${path.basename(context.outputDir)}-watch-stage-`,
    ),
  );

  try {
    await cp(libraryStaticPath, stagePath, { recursive: true });
    if (existsSync(context.userStaticPath)) {
      await cp(context.userStaticPath, stagePath, { recursive: true });
    }
    await copyNonHtmlArtifacts(
      path.join(context.outputDir, "candidate"),
      path.join(stagePath, "candidate"),
    );

    const generatedFiles = await generateHtml(
      context.specsPath,
      context.defaultTemplatePath,
      path.join(stagePath, "candidate"),
      {
        defaultTemplate: context.defaultTemplatePath,
        logger: quietGenerationLogger,
        vtPath: context.vtPath,
      },
    );
    generateOverview(
      generatedFiles,
      context.indexTemplatePath,
      path.join(stagePath, "index.html"),
      context.configData,
      {
        logger: quietGenerationLogger,
        throwOnRenderError: true,
      },
    );
    return stagePath;
  } catch (error) {
    await rm(stagePath, { force: true, recursive: true });
    throw error;
  }
};

const commitFullStage = async ({ outputDir, stagePath }) => {
  const backupPath = `${outputDir}.watch-backup-${randomUUID()}`;
  let previousMoved = false;
  let stageMoved = false;

  try {
    if (existsSync(outputDir)) {
      await rename(outputDir, backupPath);
      previousMoved = true;
    }
    await rename(stagePath, outputDir);
    stageMoved = true;
    if (previousMoved) {
      await rm(backupPath, { force: true, recursive: true });
    }
  } catch (error) {
    if (stageMoved && existsSync(outputDir)) {
      await rm(outputDir, { force: true, recursive: true });
    }
    if (previousMoved && existsSync(backupPath)) {
      await rename(backupPath, outputDir);
    }
    throw error;
  } finally {
    if (existsSync(stagePath)) {
      await rm(stagePath, { force: true, recursive: true });
    }
    if (existsSync(backupPath)) {
      await rm(backupPath, { force: true, recursive: true });
    }
  }
};

export const generateVtWatchSite = async (options = {}) => {
  const context = await loadWatchContext(options);
  const stagePath = await createFullStage(context);
  await commitFullStage({
    outputDir: context.outputDir,
    stagePath,
  });
  return context;
};

export const generateVtWatchSpecs = async ({
  cwd = process.cwd(),
  filePaths = [],
  outputDir,
} = {}) => {
  const context = await loadWatchContext({ cwd, outputDir });
  const specs = [...new Set(filePaths.map((filePath) => path.resolve(filePath)))]
    .map((resolvedFilePath) => {
      if (!isWithinDirectory({
        filePath: resolvedFilePath,
        directoryPath: context.specsPath,
      })) {
        throw new Error(
          `VT spec path is outside "${context.specsPath}": ${resolvedFilePath}`,
        );
      }
      const relativePath = path.relative(context.specsPath, resolvedFilePath);
      return {
        outputPath: path.join(
          context.candidatePath,
          convertToHtmlExtension(relativePath),
        ),
        relativePath,
        resolvedFilePath,
      };
    })
    .filter(({ relativePath }) => WATCHABLE_SPEC_PATTERN.test(relativePath));

  if (specs.length === 0) {
    return { ...context, outputPaths: [], overviewPaths: [] };
  }
  const affectedSections = getAffectedSections({
    configData: context.configData,
    specs,
  });
  const overviewPaths = affectedSections.map((section) =>
    path.join(
      context.outputDir,
      `${deriveSectionPageKey(section)}.html`,
    )
  );
  if (specs.some(({ resolvedFilePath }) => !existsSync(resolvedFilePath))) {
    return {
      ...(await generateVtWatchSite({ cwd, outputDir })),
      outputPaths: specs.map(({ outputPath }) => outputPath),
      overviewPaths,
    };
  }

  await mkdir(path.dirname(context.outputDir), { recursive: true });
  const stagePath = await mkdtemp(
    path.join(
      path.dirname(context.outputDir),
      `.${path.basename(context.outputDir)}-watch-spec-`,
    ),
  );

  try {
    const sourceFiles = new Map(
      specs.map((spec) => [spec.resolvedFilePath, spec.resolvedFilePath]),
    );
    if (affectedSections.length > 0) {
      for (const sourceFilePath of await collectFiles(context.specsPath)) {
        const relativePath = path.relative(
          context.specsPath,
          sourceFilePath,
        );
        if (affectedSections.some((section) =>
          isSpecInSection(relativePath, section)
        )) {
          sourceFiles.set(sourceFilePath, sourceFilePath);
        }
      }
    }

    for (const sourceFilePath of sourceFiles.values()) {
      const relativePath = path.relative(
        context.specsPath,
        sourceFilePath,
      );
      const stagedSpecPath = path.join(
        stagePath,
        "specs",
        relativePath,
      );
      await mkdir(path.dirname(stagedSpecPath), { recursive: true });
      await copyFile(sourceFilePath, stagedSpecPath);
    }

    const stagedCandidatePath = path.join(stagePath, "candidate");
    const generatedFiles = await generateHtml(
      path.join(stagePath, "specs"),
      context.defaultTemplatePath,
      stagedCandidatePath,
      {
        defaultTemplate: context.defaultTemplatePath,
        logger: quietGenerationLogger,
        vtPath: context.vtPath,
      },
    );
    if (affectedSections.length > 0) {
      generateOverview(
        generatedFiles,
        context.indexTemplatePath,
        path.join(stagePath, "index.html"),
        context.configData,
        {
          logger: quietGenerationLogger,
          throwOnRenderError: true,
        },
      );
    }

    await commitStagedOutputs([
      ...specs.map((spec) => ({
        outputPath: spec.outputPath,
        stagedOutputPath: path.join(
          stagedCandidatePath,
          convertToHtmlExtension(spec.relativePath),
        ),
      })),
      ...affectedSections.map((section) => {
        const fileName = `${deriveSectionPageKey(section)}.html`;
        return {
          outputPath: path.join(context.outputDir, fileName),
          stagedOutputPath: path.join(stagePath, fileName),
        };
      }),
    ]);

    return {
      ...context,
      outputPaths: specs.map(({ outputPath }) => outputPath),
      overviewPaths,
    };
  } finally {
    await rm(stagePath, { force: true, recursive: true });
  }
};

export const generateVtWatchSpec = async ({
  cwd = process.cwd(),
  filePath,
  outputDir,
} = {}) => {
  const result = await generateVtWatchSpecs({
    cwd,
    filePaths: [filePath],
    outputDir,
  });
  return {
    ...result,
    outputPath: result.outputPaths[0] || null,
  };
};

const resolveServedPath = async ({ outputDir, requestUrl }) => {
  const pathname = getRequestPathname(requestUrl);
  if (pathname === null) return null;
  if (pathname.includes("\0")) return null;

  const relativePath = pathname === "/"
    ? "index.html"
    : pathname.replace(/^\/+/, "");
  let filePath = path.resolve(outputDir, relativePath);
  if (!isWithinDirectory({ filePath, directoryPath: outputDir })) return null;

  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch {
    if (!path.extname(filePath)) {
      const htmlPath = `${filePath}.html`;
      if (isWithinDirectory({ filePath: htmlPath, directoryPath: outputDir })) {
        try {
          fileStats = await stat(htmlPath);
          filePath = htmlPath;
        } catch {
          // Continue to the normal Vite middleware chain.
        }
      }
    }
    if (!fileStats) return null;
  }

  if (fileStats.isDirectory()) {
    filePath = path.join(filePath, "index.html");
    if (!isWithinDirectory({ filePath, directoryPath: outputDir })) return null;
    try {
      fileStats = await stat(filePath);
    } catch {
      return null;
    }
  }
  if (!fileStats.isFile()) return null;

  try {
    const [canonicalOutputDir, canonicalFilePath] = await Promise.all([
      realpath(outputDir),
      realpath(filePath),
    ]);
    return isWithinDirectory({
      filePath: canonicalFilePath,
      directoryPath: canonicalOutputDir,
    })
      ? canonicalFilePath
      : null;
  } catch {
    return null;
  }
};

export const createRettangoliVtWatchPlugin = ({
  cwd = process.cwd(),
  debounceMs = 40,
  eventName = RETTANGOLI_VT_WATCH_EVENT,
  outputDir = path.join(".rettangoli", "vt", "_site"),
  publicEntryPath = "/public/main.js",
  createWatchClientModuleSource,
  logger = console,
} = {}) => {
  if (typeof createWatchClientModuleSource !== "function") {
    throw new TypeError(
      "createWatchClientModuleSource must be provided by the watch-client runtime.",
    );
  }

  const resolvedOutputDir = path.resolve(cwd, outputDir);
  const normalizedPublicEntryPath =
    getRequestPathname(publicEntryPath) || "/public/main.js";
  let devServer = null;
  let revision = 0;
  let currentContext = null;
  let currentError = null;
  let debounceTimer = null;
  let isGenerating = false;
  const pendingChanges = new Map();

  const send = (data) => {
    devServer?.ws.send({
      type: "custom",
      event: eventName,
      data,
    });
  };

  const sendError = (error) => {
    const message = error?.stack || error?.message || String(error);
    currentError = message;
    logger.error(
      "[VT Watch] Generation failed; keeping the last valid candidate.",
      error,
    );
    send({
      type: "watch-error",
      message,
    });
  };

  const sendUpdate = ({ paths = [] } = {}) => {
    revision += 1;
    currentError = null;
    send({
      type: "reload-current",
      updateKind: "html",
      paths,
      revision,
    });
  };

  const flushChanges = async () => {
    if (isGenerating) return;
    isGenerating = true;
    try {
      while (pendingChanges.size > 0) {
        const changes = [...pendingChanges.values()];
        pendingChanges.clear();
        const requiresFullGeneration = changes.some(
          (change) =>
            change.scope !== "spec" ||
            change.event !== "change",
        );
        try {
          if (requiresFullGeneration) {
            currentContext = await generateVtWatchSite({ cwd, outputDir });
            devServer?.watcher.add([
              currentContext.configPath,
              currentContext.specsPath,
              currentContext.templatesPath,
            ]);
          } else {
            await generateVtWatchSpecs({
              cwd,
              filePaths: changes.map((change) => change.filePath),
              outputDir,
            });
          }
          sendUpdate({
            paths: changes.map((change) => toPosixPath(change.relativePath)),
          });
          logger.log(
            `[VT Watch] Updated ${changes.length} source file(s).`,
          );
        } catch (error) {
          sendError(error);
        }
      }
    } finally {
      isGenerating = false;
    }
  };

  const scheduleChange = (change) => {
    const key = `${change.scope}:${change.relativePath}`;
    const previousChange = pendingChanges.get(key);
    pendingChanges.set(key, {
      ...change,
      event:
        change.event === "change" &&
        previousChange &&
        previousChange.event !== "change"
          ? previousChange.event
          : change.event,
    });
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void flushChanges();
    }, debounceMs);
  };

  const classifySourcePath = (filePath, context) => {
    const resolvedFilePath = path.resolve(filePath);
    if (resolvedFilePath === context.configPath) {
      return {
        filePath: resolvedFilePath,
        relativePath: path.basename(resolvedFilePath),
        scope: "config",
      };
    }
    if (isWithinDirectory({
      filePath: resolvedFilePath,
      directoryPath: context.templatesPath,
    })) {
      return {
        filePath: resolvedFilePath,
        relativePath: path.relative(context.vtPath, resolvedFilePath),
        scope: "template",
      };
    }
    if (
      WATCHABLE_SPEC_PATTERN.test(resolvedFilePath) &&
      isWithinDirectory({
        filePath: resolvedFilePath,
        directoryPath: context.specsPath,
      })
    ) {
      return {
        filePath: resolvedFilePath,
        relativePath: path.relative(context.vtPath, resolvedFilePath),
        scope: "spec",
      };
    }
    return null;
  };

  return {
    name: "rettangoli-vt-watch",
    enforce: "pre",
    resolveId(id) {
      if (id === RETTANGOLI_VT_WATCH_CLIENT_ID || id === WATCH_CLIENT_PATH) {
        return RESOLVED_WATCH_CLIENT_ID;
      }
      if (id === RETTANGOLI_VT_WATCH_BOUNDARY_ID) {
        return RESOLVED_WATCH_BOUNDARY_ID;
      }
      return null;
    },
    load(id) {
      if (id === RESOLVED_WATCH_BOUNDARY_ID) {
        return "if (import.meta.hot) import.meta.hot.accept();";
      }
      if (id === RESOLVED_WATCH_CLIENT_ID) {
        return [
          `import ${JSON.stringify(RETTANGOLI_VT_WATCH_BOUNDARY_ID)};`,
          createWatchClientModuleSource({
            eventName,
            reloadMode: "body",
          }),
        ].join("\n");
      }
      return null;
    },
    async configureServer(server) {
      devServer = server;
      currentContext = await generateVtWatchSite({ cwd, outputDir });
      logger.log("[VT Watch] Generated the current VT site.");
      server.watcher.add([
        currentContext.configPath,
        currentContext.specsPath,
        currentContext.templatesPath,
      ]);

      const onSourceEvent = (event, filePath) => {
        const change = currentContext
          ? classifySourcePath(filePath, currentContext)
          : null;
        if (change) scheduleChange({ ...change, event });
      };
      server.watcher.on("add", (filePath) => onSourceEvent("add", filePath));
      server.watcher.on(
        "change",
        (filePath) => onSourceEvent("change", filePath),
      );
      server.watcher.on(
        "unlink",
        (filePath) => onSourceEvent("unlink", filePath),
      );
      server.ws.on(`${eventName}:state-request`, (_data, client) => {
        client.send(eventName, currentError
          ? {
              type: "watch-error",
              message: currentError,
            }
          : {
              type: "reload-current",
              updateKind: "html",
              revision,
            });
      });

      server.middlewares.use(async (request, response, next) => {
        if (
          request.method !== "GET" &&
          request.method !== "HEAD"
        ) {
          next();
          return;
        }
        const requestPathname = getRequestPathname(request.url);
        if (requestPathname === null) {
          next();
          return;
        }
        if (requestPathname === normalizedPublicEntryPath) {
          next();
          return;
        }

        const filePath = await resolveServedPath({
          outputDir: resolvedOutputDir,
          requestUrl: request.url,
        });
        if (!filePath) {
          next();
          return;
        }

        try {
          response.statusCode = 200;
          response.setHeader("Cache-Control", "no-store");
          response.setHeader("Content-Type", getContentType(filePath));
          if (request.method === "HEAD") {
            response.end();
            return;
          }
          if (/\.html?$/i.test(filePath)) {
            const chunks = [];
            for await (const chunk of createReadStream(filePath)) {
              chunks.push(chunk);
            }
            response.end(injectWatchClient(Buffer.concat(chunks).toString("utf8")));
            return;
          }
          await pipeline(createReadStream(filePath), response);
        } catch (error) {
          if (response.headersSent) {
            response.destroy(error);
          } else {
            next(error);
          }
        }
      });
    },
    handleHotUpdate(context) {
      const sourceChange = currentContext
        ? classifySourcePath(context.file, currentContext)
        : null;
      if (sourceChange) {
        const boundaryModule = devServer?.moduleGraph.getModuleById(
          RESOLVED_WATCH_BOUNDARY_ID,
        );
        return boundaryModule ? [boundaryModule] : context.modules;
      }
      const generatedChange = isWithinDirectory({
        filePath: path.resolve(context.file),
        directoryPath: resolvedOutputDir,
      });
      if (generatedChange) return [];
      return undefined;
    },
    hotUpdate(options) {
      const sourceChange = currentContext
        ? classifySourcePath(options.file, currentContext)
        : null;
      const generatedChange = isWithinDirectory({
        filePath: path.resolve(options.file),
        directoryPath: resolvedOutputDir,
      });
      if (!sourceChange && !generatedChange) return undefined;

      const boundaryModule = this.environment.moduleGraph.getModuleById(
        RESOLVED_WATCH_BOUNDARY_ID,
      );
      return boundaryModule ? [boundaryModule] : options.modules;
    },
  };
};
