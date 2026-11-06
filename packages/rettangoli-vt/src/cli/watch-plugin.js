import { randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import {
  copyFile, mkdir, mkdtemp, readdir, realpath, rename, rm, stat, writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import { parse } from "parse5";

import { generateHtml, generateOverview } from "../common.js";
import { readVtConfig } from "../config/load-vt-config.js";
import { copySiteStatic, renderSite, resolveTemplatePaths } from "../site/build-site.js";
import { deriveSectionPageKey } from "../section-page-key.js";
import { isPathInside } from "../path-safety.js";
import {
  compareNames, hasIgnoredSpecSegment, listSpecFiles, toHtmlOutputPath,
} from "../spec-files.js";

const libraryTemplatesPath = fileURLToPath(new URL("./templates", import.meta.url));
const libraryStaticPath = fileURLToPath(new URL("./static", import.meta.url));

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
const WATCH_ENTRY_ATTRIBUTE = "data-rtgl-watch-entry";
const WATCH_PENDING_SCRIPT_ATTRIBUTE = "data-rtgl-watch-pending-script";
const WATCH_ORIGINAL_TYPE_ATTRIBUTE = "data-rtgl-watch-original-type";
const WATCH_HAD_TYPE_ATTRIBUTE = "data-rtgl-watch-had-type";
const WATCH_INERT_SCRIPT_TYPE = "application/x-rettangoli-watch-pending";
const WATCHABLE_SPEC_PATTERN = /\.(?:html?|ya?ml)$/i;
const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const JAVASCRIPT_MIME_TYPE_ESSENCES = new Set([
  "application/ecmascript", "application/javascript", "application/x-ecmascript",
  "application/x-javascript", "text/ecmascript", "text/javascript", "text/javascript1.0",
  "text/javascript1.1", "text/javascript1.2", "text/javascript1.3", "text/javascript1.4",
  "text/javascript1.5", "text/jscript", "text/livescript", "text/x-ecmascript",
  "text/x-javascript",
]);
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

const getNodeAttributes = (node) =>
  new Map(node.attrs?.map(({ name, value }) => [name, value]) || []);

const getMimeTypeEssence = (value) =>
  value.split(";", 1)[0].trim().toLowerCase();

const isReplayableScript = (node) => {
  const attributes = getNodeAttributes(node);
  const type = (attributes.get("type") || "").trim().toLowerCase();
  return (
    type === "" ||
    type === "module" ||
    JAVASCRIPT_MIME_TYPE_ESSENCES.has(getMimeTypeEssence(type))
  );
};

const isHtmlElement = (node, tagName) =>
  node.namespaceURI === HTML_NAMESPACE && node.tagName === tagName;

// Visits the parsed document until `visit` returns true. parse5 keeps <template> contents in
// `content`, not `childNodes`, so inert template markup is never visited.
const walkElements = (root, visit) => {
  const nodes = [root];
  while (nodes.length > 0) {
    const node = nodes.pop();
    if (visit(node) === true) return;
    if (node.childNodes) nodes.push(...node.childNodes);
  }
};

const byStartOffset = (left, right) =>
  left.sourceCodeLocation.startTag.startOffset -
  right.sourceCodeLocation.startTag.startOffset;

const escapeHtmlAttribute = (value) =>
  String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");

const markWatchScript = ({
  edits,
  html,
  markerAttribute,
  script,
}) => {
  const attributes = getNodeAttributes(script);
  const startTagLocation = script.sourceCodeLocation.startTag;
  const typeLocation = script.sourceCodeLocation.attrs?.type;
  const originalType = attributes.get("type") || "";
  const insertionOffset =
    html[startTagLocation.endOffset - 2] === "/"
      ? startTagLocation.endOffset - 2
      : startTagLocation.endOffset - 1;

  if (typeLocation) {
    edits.push({
      end: typeLocation.endOffset,
      start: typeLocation.startOffset,
      text: "",
    });
  }

  edits.push({
    end: insertionOffset,
    start: insertionOffset,
    text:
      ` type="${WATCH_INERT_SCRIPT_TYPE}" ${markerAttribute}` +
      ` ${WATCH_ORIGINAL_TYPE_ATTRIBUTE}="${escapeHtmlAttribute(originalType)}"` +
      (typeLocation ? ` ${WATCH_HAD_TYPE_ATTRIBUTE}` : ""),
  });
};

const rewriteWatchScripts = ({
  documentUrl = "http://rettangoli.local/",
  html,
  publicEntryPath,
}) => {
  const scripts = [];
  const bases = [];
  walkElements(parse(html, { sourceCodeLocationInfo: true }), (node) => {
    if (!node.sourceCodeLocation?.startTag) return false;
    if (isHtmlElement(node, "script")) scripts.push(node);
    if (isHtmlElement(node, "base") && getNodeAttributes(node).has("href")) {
      bases.push(node);
    }
    return false;
  });
  scripts.sort(byStartOffset);
  bases.sort(byStartOffset);
  const resolvedDocumentUrl = new URL(
    documentUrl,
    "http://rettangoli.local/",
  );
  let scriptBaseUrl = resolvedDocumentUrl;
  if (bases.length > 0) {
    try {
      scriptBaseUrl = new URL(
        getNodeAttributes(bases[0]).get("href"),
        resolvedDocumentUrl,
      );
    } catch {
      // Match browser behavior by ignoring an invalid document base URL.
    }
  }
  const entryUrl = new URL(publicEntryPath, resolvedDocumentUrl.origin);
  const entryIndex = scripts.findIndex((script) => {
    const attributes = getNodeAttributes(script);
    if (!isReplayableScript(script) || !attributes.has("src")) return false;
    try {
      const scriptUrl = new URL(attributes.get("src"), scriptBaseUrl);
      return (
        scriptUrl.origin === entryUrl.origin &&
        scriptUrl.pathname === entryUrl.pathname
      );
    } catch {
      return false;
    }
  });

  if (entryIndex < 0) return html;

  const edits = [];
  markWatchScript({
    edits,
    html,
    markerAttribute: WATCH_ENTRY_ATTRIBUTE,
    script: scripts[entryIndex],
  });

  for (const script of scripts.slice(entryIndex + 1)) {
    const attributes = getNodeAttributes(script);
    if (
      attributes.has("data-rtgl-watch-client") ||
      !isReplayableScript(script)
    ) {
      continue;
    }
    markWatchScript({
      edits,
      html,
      markerAttribute: WATCH_PENDING_SCRIPT_ATTRIBUTE,
      script,
    });
  }

  return edits
    .sort((left, right) => right.start - left.start)
    .reduce(
      (result, edit) =>
        result.slice(0, edit.start) + edit.text + result.slice(edit.end),
      html,
    );
};

const createWatchEntryBootstrapSource = () => `
const __rtglWatchEntry = document.querySelector(
  "script[${WATCH_ENTRY_ATTRIBUTE}][src]",
);
if (__rtglWatchEntry) {
  try {
    await import(/* @vite-ignore */ __rtglWatchEntry.src);
  } catch (__rtglError) {
    console.error("[VT Watch] Failed to load the watch entry.", __rtglError);
  }
}

const __rtglReplayScript = (__rtglSource) => new Promise(
  (__rtglResolve, __rtglReject) => {
    const __rtglOriginalType =
      __rtglSource.getAttribute("${WATCH_ORIGINAL_TYPE_ATTRIBUTE}") || "";
    if (
      __rtglSource.hasAttribute("nomodule") &&
      __rtglOriginalType.trim().toLowerCase() !== "module"
    ) {
      __rtglResolve();
      return;
    }

    const __rtglParent = __rtglSource.parentNode;
    if (!__rtglParent) {
      __rtglResolve();
      return;
    }
    const __rtglNextSibling = __rtglSource.nextSibling;
    const __rtglScript = document.createElement("script");
    for (const __rtglAttribute of __rtglSource.attributes) {
      if (
        __rtglAttribute.name === "type" ||
        __rtglAttribute.name === "${WATCH_PENDING_SCRIPT_ATTRIBUTE}" ||
        __rtglAttribute.name === "${WATCH_ORIGINAL_TYPE_ATTRIBUTE}" ||
        __rtglAttribute.name === "${WATCH_HAD_TYPE_ATTRIBUTE}"
      ) {
        continue;
      }
      __rtglScript.setAttributeNS(
        __rtglAttribute.namespaceURI,
        __rtglAttribute.name,
        __rtglAttribute.value,
      );
    }

    if (__rtglSource.hasAttribute("${WATCH_HAD_TYPE_ATTRIBUTE}")) {
      __rtglScript.setAttribute("type", __rtglOriginalType);
    }
    __rtglScript.textContent = __rtglSource.textContent;
    if (!__rtglSource.hasAttribute("async")) {
      __rtglScript.async = false;
    }

    const __rtglRestoreSource = () => {
      if (__rtglScript.parentNode) {
        __rtglScript.replaceWith(__rtglSource);
        return;
      }
      if (
        !__rtglSource.parentNode &&
        __rtglParent.isConnected
      ) {
        __rtglParent.insertBefore(
          __rtglSource,
          __rtglNextSibling?.parentNode === __rtglParent
            ? __rtglNextSibling
            : null,
        );
      }
    };

    const __rtglIsInlineModule =
      !__rtglSource.hasAttribute("src") &&
      __rtglOriginalType.trim().toLowerCase() === "module";
    if (__rtglIsInlineModule) {
      // Chromium executes a prepared inline module after it is detached, but
      // fires neither load nor error on the dynamically inserted script.
      __rtglSource.replaceWith(__rtglScript);
      __rtglRestoreSource();
      __rtglResolve();
      return;
    }

    const __rtglWaitForLoad = __rtglSource.hasAttribute("src");
    if (__rtglWaitForLoad) {
      __rtglScript.addEventListener("load", () => {
        __rtglRestoreSource();
        __rtglResolve();
      }, { once: true });
      __rtglScript.addEventListener("error", () => {
        const __rtglSourceName =
          __rtglSource.getAttribute("src") || "inline module";
        __rtglRestoreSource();
        __rtglReject(
          new Error(
            "[VT Watch] Failed to replay script: " + __rtglSourceName,
          ),
        );
      }, { once: true });
      __rtglSource.replaceWith(__rtglScript);
      return;
    }

    __rtglSource.replaceWith(__rtglScript);
    __rtglRestoreSource();
    __rtglResolve();
  },
);

for (
  const __rtglPendingScript of document.querySelectorAll(
    "script[${WATCH_PENDING_SCRIPT_ATTRIBUTE}]",
  )
) {
  try {
    await __rtglReplayScript(__rtglPendingScript);
  } catch (__rtglError) {
    console.error(__rtglError);
  }
}
`.trim();

const isWatchClientScript = (node) => {
  const attributes = getNodeAttributes(node);
  return (
    isHtmlElement(node, "script") &&
    attributes.has("data-rtgl-watch-client") &&
    attributes.get("type")?.trim().toLowerCase() === "module" &&
    attributes.get("src") === WATCH_CLIENT_PATH
  );
};

const injectWatchClient = (html) => {
  const found = {};
  let hasWatchClient = false;
  walkElements(parse(html, { sourceCodeLocationInfo: true }), (node) => {
    if (isWatchClientScript(node)) {
      hasWatchClient = true;
      return true;
    }
    if (node.nodeName === "#documentType") {
      found.doctype = node;
    } else if (
      node.namespaceURI === HTML_NAMESPACE &&
      ["body", "head", "html"].includes(node.tagName)
    ) {
      found[node.tagName] = node;
    }
    return false;
  });
  if (hasWatchClient) return html;

  const { body = null, doctype = null, head = null } = found;
  const htmlElement = found.html ?? null;
  const bodyCloseIndex =
    body?.sourceCodeLocation?.endTag?.startOffset ?? null;
  const htmlCloseIndex =
    htmlElement?.sourceCodeLocation?.endTag?.startOffset ?? null;
  const parsedDoctypeEndIndex =
    doctype?.sourceCodeLocation?.endOffset ?? null;
  const doctypeEndIndex =
    parsedDoctypeEndIndex !== null &&
    html[parsedDoctypeEndIndex - 1] === ">"
      ? parsedDoctypeEndIndex
      : null;
  const insertionIndex =
    bodyCloseIndex ??
    (body === null ? null : htmlCloseIndex) ??
    body?.sourceCodeLocation?.startTag?.endOffset ??
    head?.sourceCodeLocation?.startTag?.endOffset ??
    htmlElement?.sourceCodeLocation?.startTag?.endOffset ??
    doctypeEndIndex ??
    0;
  return html.slice(0, insertionIndex) +
    WATCH_CLIENT_TAG +
    html.slice(insertionIndex);
};

const getWatchDocumentUrl = (request) => {
  const protocol = request.socket?.encrypted ? "https:" : "http:";
  const host =
    typeof request.headers?.host === "string" && request.headers.host.length > 0
      ? request.headers.host
      : "rettangoli.local";
  try {
    return new URL(request.url || "/", `${protocol}//${host}`).href;
  } catch {
    return new URL(
      request.url || "/",
      "http://rettangoli.local/",
    ).href;
  }
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
    ".cjs": "application/javascript; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
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
  const configData = await readVtConfig(configPath);
  const vtPath = path.resolve(cwd, configData.path || "vt");
  const { templatesPath, defaultTemplatePath, indexTemplatePath } =
    resolveTemplatePaths(vtPath, libraryTemplatesPath);

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

// listSpecFiles' order (depth-first, siblings in byte order) for paths relative to the specs folder.
const compareSpecPaths = (left, right) => {
  const leftSegments = left.split(path.sep);
  const rightSegments = right.split(path.sep);
  for (let index = 0; index < Math.min(leftSegments.length, rightSegments.length); index += 1) {
    const order = compareNames(leftSegments[index], rightSegments[index]);
    if (order !== 0) return order;
  }
  return leftSegments.length - rightSegments.length;
};

const isWatchableSpec = (relativePath) =>
  WATCHABLE_SPEC_PATTERN.test(relativePath) && !hasIgnoredSpecSegment(relativePath);

// What the watch client must refresh after a batch (same kinds as sites' classifyWatchChanges).
// Static CSS can be swapped in place ("assets"); any other static file or a removal needs a
// "full" reload; spec, template and config changes morph the page ("html").
const classifyUpdate = (changes) => {
  const staticChanges = changes.filter((change) => change.scope === "static");
  if (staticChanges.some((change) =>
    change.event === "unlink" || !/\.css$/i.test(change.publicPath)
  )) {
    return { updateKind: "full", paths: [] };
  }
  // enqueueChange keys changes by path, so a batch holds each static file at most once.
  const assetPaths = staticChanges.map((change) => change.publicPath).sort();
  const sourcePaths = changes
    .filter((change) => change.scope !== "static")
    .map((change) => toPosixPath(change.relativePath));
  return sourcePaths.length === 0
    ? { updateKind: "assets", paths: assetPaths }
    : { updateKind: "html", paths: [...sourcePaths, ...assetPaths] };
};

// Writes every output to a sibling temp file, then moves the previous files aside and the new ones
// in. On failure the committed outputs are removed and the previous files restored.
const commitStagedOutputs = async (outputs) => {
  const uniqueOutputs = [
    ...new Map(outputs.map((output) => [output.targetPath, output])).values(),
  ];
  const commits = [];

  try {
    for (const { targetPath: outputPath, content } of uniqueOutputs) {
      const token = randomUUID();
      const temporaryOutputPath = `${outputPath}.watch-${token}.tmp`;
      const backupOutputPath = `${outputPath}.watch-${token}.backup`;
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(temporaryOutputPath, content, "utf8");
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
    await copySiteStatic(stagePath, {
      libraryStaticPath,
      userStaticPath: context.userStaticPath,
    });
    await copyNonHtmlArtifacts(
      path.join(context.outputDir, "candidate"),
      path.join(stagePath, "candidate"),
    );
    await renderSite({
      specsPath: context.specsPath,
      candidateDir: path.join(stagePath, "candidate"),
      siteDir: stagePath,
      templatePaths: {
        defaultTemplatePath: context.defaultTemplatePath,
        indexTemplatePath: context.indexTemplatePath,
      },
      vtPath: context.vtPath,
      configData: context.configData,
      logger: quietGenerationLogger,
      throwOnRenderError: true,
    });
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
      if (!isPathInside(context.specsPath, resolvedFilePath)) {
        throw new Error(
          `VT spec path is outside "${context.specsPath}": ${resolvedFilePath}`,
        );
      }
      const relativePath = path.relative(context.specsPath, resolvedFilePath);
      return {
        outputPath: path.join(
          context.candidatePath,
          toHtmlOutputPath(relativePath),
        ),
        relativePath,
        resolvedFilePath,
      };
    })
    .filter(({ relativePath }) => isWatchableSpec(relativePath));

  if (specs.length === 0) {
    return { ...context, outputPaths: [], overviewPaths: [] };
  }
  const affectedSections = getAffectedSections({
    configData: context.configData,
    specs,
  });
  const overviewFileNames = affectedSections.map((section) =>
    `${deriveSectionPageKey(section)}.html`
  );
  const overviewPaths = overviewFileNames.map((fileName) =>
    path.join(context.outputDir, fileName)
  );
  if (specs.some(({ resolvedFilePath }) => !existsSync(resolvedFilePath))) {
    return {
      ...(await generateVtWatchSite({ cwd, outputDir })),
      outputPaths: specs.map(({ outputPath }) => outputPath),
      overviewPaths,
    };
  }

  // Render the changed specs, plus every spec of the affected sections for their overview pages, in
  // memory and in discovery order; commit only the changed pages and the affected overview pages.
  const relativePaths = new Set(specs.map(({ relativePath }) => relativePath));
  if (affectedSections.length > 0) {
    for (const sourceFilePath of listSpecFiles(context.specsPath)) {
      const relativePath = path.relative(context.specsPath, sourceFilePath);
      if (affectedSections.some((section) => isSpecInSection(relativePath, section))) {
        relativePaths.add(relativePath);
      }
    }
  }
  const generatedFiles = await generateHtml(
    context.specsPath,
    context.defaultTemplatePath,
    null,
    {
      defaultTemplate: context.defaultTemplatePath,
      filePaths: [...relativePaths]
        .sort(compareSpecPaths)
        .map((relativePath) => path.join(context.specsPath, relativePath)),
      logger: quietGenerationLogger,
      vtPath: context.vtPath,
    },
  );
  const renderedSpecs = new Map(
    generatedFiles.map((file) => [file.path, file.renderedContent]),
  );
  const overviewPages = new Map();
  if (affectedSections.length > 0) {
    const pages = generateOverview(
      generatedFiles,
      context.indexTemplatePath,
      null,
      context.configData,
      { logger: quietGenerationLogger, throwOnRenderError: true },
    );
    // A later page with the same name wins, as when the pages were written to disk.
    for (const { fileName, content } of pages) overviewPages.set(fileName, content);
  }

  await commitStagedOutputs([
    ...specs.map((spec) => ({
      targetPath: spec.outputPath,
      content: renderedSpecs.get(spec.relativePath),
    })),
    ...overviewFileNames.map((fileName, index) => ({
      targetPath: overviewPaths[index],
      content: overviewPages.get(fileName),
    })),
  ]);

  return {
    ...context,
    outputPaths: specs.map(({ outputPath }) => outputPath),
    overviewPaths,
  };
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
  if (!isPathInside(outputDir, filePath)) return null;

  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch {
    if (!path.extname(filePath)) {
      const htmlPath = `${filePath}.html`;
      if (isPathInside(outputDir, htmlPath)) {
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
    if (!isPathInside(outputDir, filePath)) return null;
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
    return isPathInside(canonicalOutputDir, canonicalFilePath)
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
  let flushRequested = false;
  const pendingChanges = new Map();

  const watchSources = (context) => {
    devServer?.watcher.add([
      context.configPath,
      context.specsPath,
      context.templatesPath,
      context.userStaticPath,
    ]);
  };

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

  const sendUpdate = ({ updateKind, paths }) => {
    revision += 1;
    currentError = null;
    send({
      type: "reload-current",
      updateKind,
      paths,
      revision,
    });
  };

  const enqueueChange = (change) => {
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
  };

  const flushChanges = async () => {
    if (isGenerating) {
      flushRequested = true;
      return;
    }
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
            watchSources(currentContext);
          } else {
            await generateVtWatchSpecs({
              cwd,
              filePaths: changes.map((change) => change.filePath),
              outputDir,
            });
          }
          sendUpdate(classifyUpdate(changes));
          logger.log(
            `[VT Watch] Updated ${changes.length} source file(s).`,
          );
        } catch (error) {
          const newerChanges = [...pendingChanges.values()];
          pendingChanges.clear();
          for (const change of changes) enqueueChange(change);
          for (const change of newerChanges) enqueueChange(change);
          sendError(error);
          break;
        }
      }
    } finally {
      isGenerating = false;
      if (flushRequested) {
        flushRequested = false;
        void flushChanges();
      }
    }
  };

  const scheduleChange = (change) => {
    enqueueChange(change);
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
    if (isPathInside(context.templatesPath, resolvedFilePath)) {
      return {
        filePath: resolvedFilePath,
        relativePath: path.relative(context.vtPath, resolvedFilePath),
        scope: "template",
      };
    }
    if (
      isPathInside(context.specsPath, resolvedFilePath) &&
      isWatchableSpec(path.relative(context.specsPath, resolvedFilePath))
    ) {
      return {
        filePath: resolvedFilePath,
        relativePath: path.relative(context.vtPath, resolvedFilePath),
        scope: "spec",
      };
    }
    if (isPathInside(context.userStaticPath, resolvedFilePath)) {
      const staticPath = path.relative(context.userStaticPath, resolvedFilePath);
      const publicPath = `/${toPosixPath(staticPath)}`;
      // The FE entry is served by Vite (see the middleware); it and its source map are FE build
      // output, not VT assets, and editor files (swap files, backups) are not assets either.
      if (
        publicPath === normalizedPublicEntryPath ||
        publicPath === `${normalizedPublicEntryPath}.map` ||
        hasIgnoredSpecSegment(staticPath)
      ) {
        return null;
      }
      return {
        filePath: resolvedFilePath,
        publicPath,
        relativePath: path.relative(context.vtPath, resolvedFilePath),
        scope: "static",
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
          createWatchEntryBootstrapSource(),
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
      watchSources(currentContext);

      for (const event of ["add", "change", "unlink"]) {
        server.watcher.on(event, (filePath) => {
          const change = currentContext
            ? classifySourcePath(filePath, currentContext)
            : null;
          if (change) scheduleChange({ ...change, event });
        });
      }
      server.ws.on(`${eventName}:state-request`, (_data, client) => {
        client.send(eventName, currentError
          ? {
              type: "watch-error",
              message: currentError,
            }
          : {
              type: "watch-state",
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
            response.end(injectWatchClient(rewriteWatchScripts({
              documentUrl: getWatchDocumentUrl(request),
              html: Buffer.concat(chunks).toString("utf8"),
              publicEntryPath: normalizedPublicEntryPath,
            })));
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
    hotUpdate(options) {
      const sourceChange = currentContext
        ? classifySourcePath(options.file, currentContext)
        : null;
      const generatedChange = isPathInside(resolvedOutputDir, path.resolve(options.file));
      if (!sourceChange && !generatedChange) return undefined;

      const boundaryModule = this.environment.moduleGraph.getModuleById(
        RESOLVED_WATCH_BOUNDARY_ID,
      );
      return boundaryModule ? [boundaryModule] : options.modules;
    },
  };
};
