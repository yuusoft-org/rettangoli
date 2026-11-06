import {
  statSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { join, dirname, resolve, extname } from "path";
import http from "http";
import { load as loadYaml } from "js-yaml";
import { codeToHtml } from "shiki";
import path from "path";
import { validateFrontMatter } from "./validation.js";
import { createCaptureTasks } from "./capture/spec-loader.js";
import { runCaptureScheduler } from "./capture/capture-scheduler.js";
import { deriveAnchorId, deriveSectionPageKey } from "./section-page-key.js";
import {
  assertUniqueHtmlOutputs,
  listSpecFiles,
  removeExtension,
  toHtmlOutputPath,
} from "./spec-files.js";
import { isPathInside } from "./path-safety.js";
import { createLiquidEngine } from "./render/liquid.js";

const engine = createLiquidEngine();

/**
 * Read and parse a YAML file
 */
async function readYaml(filePath) {
  try {
    const fileContent = readFileSync(filePath, "utf8");
    return loadYaml(fileContent);
  } catch (error) {
    console.error(`Error reading YAML file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Get all spec files from a directory recursively (byte-sorted, stray files ignored)
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  arrayOfFiles.push(...listSpecFiles(dirPath, { logger: console }));
  return arrayOfFiles;
}

/**
 * Extract frontmatter from content
 */
function extractFrontMatter(content) {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*(\r?\n|$)/;
  const match = content.match(frontMatterRegex);
  if (!match) {
    return {
      content: content,
      frontMatter: null,
    };
  }

  const frontMatter = match[1].trim();
  const contentWithoutFrontMatter = content.slice(match[0].length).trim();

  return {
    content: contentWithoutFrontMatter,
    frontMatter: frontMatter,
  };
}

/**
 * Ensure directory exists
 */
function ensureDirectoryExists(dirPath) {
  const absolutePath = resolve(dirPath);
  if (!statSync(absolutePath, { throwIfNoEntry: false })) {
    mkdirSync(absolutePath, { recursive: true });
  }
}
/**
 * Render one spec file with its template. Returns its processedFiles entry; writes nothing.
 */
async function renderSpecFile({ specsDir, filePath, templateConfig }) {
  const relativePath = path.relative(specsDir, filePath);
  const fileContent = readFileSync(filePath, "utf8");
  const { content, frontMatter } = extractFrontMatter(fileContent);
  const lang = filePath.includes(".yaml") ? "yaml" : "html";
  const contentShiki = await codeToHtml(content, {
    lang,
    theme: "slack-dark",
  });

  let frontMatterObj = null;
  if (frontMatter) {
    frontMatterObj = loadYaml(frontMatter, { filename: relativePath });
  }

  validateFrontMatter(frontMatterObj, relativePath);

  const resolvedTemplatePath = frontMatterObj?.template ?
    join(templateConfig.vtPath, "templates", frontMatterObj.template) :
    templateConfig.defaultTemplate;
  if (!existsSync(resolvedTemplatePath)) {
    throw new Error(`Template not found for "${relativePath}": ${resolvedTemplatePath}`);
  }
  const templateToUse = readFileSync(resolvedTemplatePath, "utf8");

  // Render template
  let renderedContent;
  try {
    renderedContent = engine.parseAndRenderSync(templateToUse, {
      content: content,
      frontMatter: frontMatterObj || {},
    });
  } catch (error) {
    throw new Error(
      `Failed to render template "${resolvedTemplatePath}" for "${relativePath}": ${error.message}`,
      { cause: error },
    );
  }

  return {
    path: relativePath,
    content,
    contentShiki,
    frontMatter: frontMatterObj,
    fullContent: fileContent,
    renderedContent,
  };
}

/**
 * Main function to generate HTML files from specs. `templateConfig.filePaths` replaces the discovery
 * of every spec under specsDir; with a null outputDir the pages are only rendered (watch mode).
 */
async function generateHtml(specsDir, templatePath, outputDir, templateConfig) {
  try {
    const logger = templateConfig.logger || console;
    // Fails early when the default template is missing.
    readFileSync(templatePath, "utf8");
    if (outputDir !== null) {
      ensureDirectoryExists(outputDir);
    }

    const allFiles = templateConfig.filePaths ?? getAllFiles(specsDir);
    assertUniqueHtmlOutputs(allFiles.map((filePath) => path.relative(specsDir, filePath)));

    const processedFiles = [];
    for (const filePath of allFiles) {
      const processedFile = await renderSpecFile({ specsDir, filePath, templateConfig });

      if (outputDir !== null) {
        const outputPath = join(outputDir, toHtmlOutputPath(processedFile.path));
        ensureDirectoryExists(dirname(outputPath));
        writeFileSync(outputPath, processedFile.renderedContent, "utf8");
        logger.log(`Generated: ${outputPath}`);
      }

      processedFiles.push(processedFile);
    }

    logger.log(`Successfully generated ${processedFiles.length} files`);
    return processedFiles;
  } catch (error) {
    throw new Error(`Error generating HTML: ${error.message}`, { cause: error });
  }
}

// Returns the first file under `roots` that the decoded URL path names, or null. A path that
// resolves outside a root is never served from it.
function findServedFile(roots, decodedPathname) {
  for (const root of roots) {
    const filePath = join(root, decodedPathname);
    if (isPathInside(root, filePath) && existsSync(filePath) && statSync(filePath).isFile()) {
      return filePath;
    }
  }
  return null;
}

/**
 * Start a web server to serve static files
 */
async function startWebServer(artifactsDir, staticDir, port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    // Default to index.html for root path
    let pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      // Not a valid escape (a literal "%" in a file name): look the path up as sent.
    }

    if (pathname.includes("\0")) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad Request");
      return;
    }

    // Artifacts directory first, then the static directory
    const filePath = findServedFile([artifactsDir, staticDir], pathname);
    if (filePath) {
      const fileContent = readFileSync(filePath);
      const contentType = getContentType(filePath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(fileContent);
      return;
    }

    // If not found in either directory, return 404
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  await new Promise((resolveServer, rejectServer) => {
    server.once("error", rejectServer);
    server.listen(port, () => {
      server.off("error", rejectServer);
      resolveServer();
    });
  });

  console.log(`Server started at http://localhost:${port}`);
  return server;
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".cjs": "application/javascript",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  };

  return contentTypes[ext] || "application/octet-stream";
}

function toSectionPageKey(sectionLike) {
  return deriveSectionPageKey(sectionLike);
}

/**
 * Take screenshots of all generated HTML files. `config` comes from createCaptureConfig
 * (src/capture/capture-config.js), which applies the defaults and validates it.
 */
async function takeScreenshots(config) {
  const {
    generatedFiles,
    serverUrl,
    screenshotsDir,
    workerCount,
    screenshotWaitTime,
    configUrl,
    waitEvent,
    waitSelector,
    waitStrategy,
    navigationTimeout,
    readyTimeout,
    screenshotTimeout,
    maxRetries,
    recycleEvery,
    isolationMode,
    metricsPath,
    headless,
    viewport,
    launchArgs,
    animations,
  } = config;

  ensureDirectoryExists(screenshotsDir);

  const tasks = createCaptureTasks(generatedFiles, {
    serverUrl,
    configUrl,
    waitEvent,
    waitSelector,
    waitStrategy,
    viewport,
  });

  const { summary, failures } = await runCaptureScheduler({
    tasks,
    screenshotsDir,
    workerCount,
    isolationMode,
    screenshotWaitTime,
    waitEvent,
    waitSelector,
    waitStrategy,
    navigationTimeout,
    readyTimeout,
    screenshotTimeout,
    maxRetries,
    recycleEvery,
    metricsPath,
    headless,
    launchArgs,
    animations,
  });

  if (failures.length > 0) {
    const failedDetails = failures
      .map((failure) => `- ${failure.path}: ${failure.error}`)
      .join("\n");
    throw new Error(
      `Failed to process ${failures.length} screenshot file(s):\n${failedDetails}`,
    );
  }

  console.log(
    `Capture completed: ${summary.successful}/${summary.totalTasks} succeeded in ${summary.durationMs}ms`,
  );
  return summary;
}

/**
 * Generate overview HTML from template and data. Returns the pages as [{ fileName, content }] in
 * section order; with a null outputPath they are only rendered (watch mode).
 */
function generateOverview(
  data,
  templatePath,
  outputPath,
  configData,
  { logger = console, throwOnRenderError = false } = {},
) {
  try {
    // Read template
    const templateContent = readFileSync(templatePath, "utf8");

    // Ensure output directory exists
    if (outputPath !== null) {
      ensureDirectoryExists(dirname(outputPath));
    }

    // Process sections to extract all items (flat or grouped)
    const allSections = [];
    configData.sections.forEach((section) => {
      if (section.type === "groupLabel" && section.items) {
        // It's a group, add all items from the group
        section.items.forEach((item) => {
          allSections.push(item);
        });
      } else if (section.files) {
        // It's a flat section
        allSections.push(section);
      }
    });

    // Transform sections for sidebar (maintaining group structure)
    const sidebarItems = configData.sections.map((section) => {
      if (section.type === "groupLabel") {
        return {
          title: section.title,
          type: "groupLabel",
          items: section.items.map((item) => ({
            id: toSectionPageKey(item),
            title: item.title,
            href: `/${toSectionPageKey(item)}.html`,
          })),
        };
      } else {
        // Flat item
        return {
          id: toSectionPageKey(section),
          title: section.title,
          href: `/${toSectionPageKey(section)}.html`,
        };
      }
    });

    // Generate pages for each section
    const pages = [];
    allSections.forEach((section) => {
      // Render template with data
      let renderedContent = "";
      try {
        renderedContent = engine.parseAndRenderSync(templateContent, {
          ...configData,
          files: data
            .filter((file) => {
              const filePath = path.normalize(file.path);
              const sectionPath = path.normalize(section.files);
              // Check if file is in the folder or any subfolder
              const fileDir = path.dirname(filePath);
              return fileDir === sectionPath || fileDir.startsWith(sectionPath + path.sep);
            })
            .map((file) => ({
              ...file,
              anchorId: deriveAnchorId(file.frontMatter?.title, removeExtension(file.path)),
            })),
          currentSection: section,
          sidebarItems: encodeURIComponent(JSON.stringify(sidebarItems)),
        });
      } catch (error) {
        if (throwOnRenderError) {
          throw new Error(
            `Error rendering overview template for "${section.title}": ${error.message}`,
            { cause: error },
          );
        }
        logger.error(`Error rendering overview template:`, error);
        renderedContent = `<html><body><h1>Error rendering overview template</h1><p>${error.message}</p></body></html>`;
      }

      const fileName = `${toSectionPageKey(section)}.html`;
      pages.push({ fileName, content: renderedContent });
      if (outputPath === null) {
        return;
      }
      const finalOutputPath = outputPath.replace("index.html", fileName);
      // Save file
      writeFileSync(finalOutputPath, renderedContent, "utf8");
      logger.log(`Generated overview: ${finalOutputPath}`);
    });
    return pages;
  } catch (error) {
    logger.error("Error generating overview HTML:", error);
    throw error;
  }
}

export {
  renderSpecFile,
  generateHtml,
  getAllFiles,
  extractFrontMatter,
  ensureDirectoryExists,
  startWebServer,
  takeScreenshots,
  generateOverview,
  getContentType,
  readYaml,
};
