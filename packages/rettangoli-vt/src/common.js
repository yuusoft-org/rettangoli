import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { join, dirname, resolve, extname } from "path";
import http from "http";
import { load as loadYaml } from "js-yaml";
import { Liquid } from "liquidjs";
import { codeToHtml } from "shiki";
import path from "path";
import { validateFiniteNumber, validateFrontMatter } from "./validation.js";
import { createCaptureTasks } from "./capture/spec-loader.js";
import { runCaptureScheduler } from "./capture/capture-scheduler.js";

const removeExtension = (filePath) => filePath.replace(/\.[^/.]+$/, "");

const convertToHtmlExtension = (filePath) => {
  if (filePath.endsWith(".html")) {
    return filePath;
  }
  // Remove existing extension and add .html
  const baseName = removeExtension(filePath);
  return baseName + ".html";
};

// Initialize LiquidJS with output escaping disabled
const engine = new Liquid();

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

// Add custom filter to convert string to lowercase and replace spaces with hyphens
engine.registerFilter("slug", (value) => {
  if (typeof value !== "string") return "";
  return value.toLowerCase().replace(/\s+/g, "-");
});

// Add custom filter to remove file extension
engine.registerFilter("remove_ext", (value) => {
  if (typeof value !== "string") return "";
  return removeExtension(value);
});

/**
 * Get all files from a directory recursively
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!existsSync(dirPath)) {
    console.log(`Directory ${dirPath} does not exist, skipping...`);
    return arrayOfFiles;
  }

  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

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
 * Main function to generate HTML files from specs
 */
async function generateHtml(specsDir, templatePath, outputDir, templateConfig) {
  try {
    const defaultTemplateContent = readFileSync(templatePath, "utf8");
    ensureDirectoryExists(outputDir);

    const allFiles = getAllFiles(specsDir);

    const processedFiles = [];
    for (const filePath of allFiles) {
      const fileContent = readFileSync(filePath, "utf8");
      const { content, frontMatter } = extractFrontMatter(fileContent);
      const lang = filePath.includes(".yaml") ? "yaml" : "html";
      const contentShiki = await codeToHtml(content, {
        lang,
        theme: "slack-dark",
      });

      let frontMatterObj = null;
      if (frontMatter) {
        frontMatterObj = loadYaml(frontMatter);
      }

      const relativePath = path.relative(specsDir, filePath);
      validateFrontMatter(frontMatterObj, relativePath);

      let templateToUse = defaultTemplateContent;
      const resolvedTemplatePath = frontMatterObj?.template ?
        join(templateConfig.vtPath, "templates", frontMatterObj.template) :
        templateConfig.defaultTemplate;
      if (!existsSync(resolvedTemplatePath)) {
        throw new Error(`Template not found for "${relativePath}": ${resolvedTemplatePath}`);
      }
      templateToUse = readFileSync(resolvedTemplatePath, "utf8");

      // Render template
      const renderedContent = engine.parseAndRenderSync(templateToUse, {
        content: content,
        frontMatter: frontMatterObj || {},
      });

      // Save file
      const outputPath = join(outputDir, convertToHtmlExtension(relativePath));
      ensureDirectoryExists(dirname(outputPath));
      writeFileSync(outputPath, renderedContent, "utf8");
      console.log(`Generated: ${outputPath}`);

      processedFiles.push({
        path: relativePath,
        content,
        contentShiki,
        frontMatter: frontMatterObj,
        fullContent: fileContent,
        renderedContent,
      });
    }

    console.log(`Successfully generated ${processedFiles.length} files`);
    return processedFiles;
  } catch (error) {
    throw new Error(`Error generating HTML: ${error.message}`, { cause: error });
  }
}

/**
 * Start a web server to serve static files
 */
async function startWebServer(artifactsDir, staticDir, port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let path = url.pathname;
    // Default to index.html for root path
    if (path === "/") {
      path = "/index.html";
    }

    // Remove leading slash for file path
    const filePath = path.startsWith("/") ? path.slice(1) : path;

    // Try to serve from artifacts directory first
    const artifactsPath = join(artifactsDir, filePath);
    if (existsSync(artifactsPath) && statSync(artifactsPath).isFile()) {
      const fileContent = readFileSync(artifactsPath);
      const contentType = getContentType(artifactsPath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(fileContent);
      return;
    }

    // Then try to serve from static directory
    const staticPath = join(staticDir, filePath);
    if (existsSync(staticPath) && statSync(staticPath).isFile()) {
      const fileContent = readFileSync(staticPath);
      const contentType = getContentType(staticPath);
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
    ".js": "application/javascript",
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
  return String(sectionLike.title || "").toLowerCase();
}

/**
 * Take screenshots of all generated HTML files
 */
async function takeScreenshots(options) {
  const {
    generatedFiles,
    serverUrl,
    screenshotsDir,
    workerCount,
    screenshotWaitTime = 10,
    configUrl = undefined,
    waitEvent = undefined,
    waitSelector = undefined,
    waitStrategy = undefined,
    navigationTimeout = 30000,
    readyTimeout = 30000,
    screenshotTimeout = 30000,
    maxRetries = 2,
    recycleEvery = 0,
    isolationMode = "fast",
    metricsPath = join(".rettangoli", "vt", "metrics.json"),
    headless = true,
    viewport = undefined,
  } = options;

  if (!Array.isArray(generatedFiles)) {
    throw new Error("takeScreenshots: generatedFiles must be an array.");
  }
  if (typeof serverUrl !== "string" || serverUrl.trim().length === 0) {
    throw new Error("takeScreenshots: serverUrl must be a non-empty string.");
  }
  if (typeof screenshotsDir !== "string" || screenshotsDir.trim().length === 0) {
    throw new Error("takeScreenshots: screenshotsDir must be a non-empty string.");
  }

  validateFiniteNumber(workerCount, "workerCount", { integer: true, min: 1 });
  validateFiniteNumber(screenshotWaitTime, "screenshotWaitTime", { integer: true, min: 0 });
  validateFiniteNumber(navigationTimeout, "navigationTimeout", { integer: true, min: 1 });
  validateFiniteNumber(readyTimeout, "readyTimeout", { integer: true, min: 1 });
  validateFiniteNumber(screenshotTimeout, "screenshotTimeout", { integer: true, min: 1 });
  validateFiniteNumber(maxRetries, "maxRetries", { integer: true, min: 0 });
  validateFiniteNumber(recycleEvery, "recycleEvery", { integer: true, min: 0 });

  if (!["strict", "fast"].includes(isolationMode)) {
    throw new Error(
      `Invalid isolationMode "${isolationMode}". Expected "strict" or "fast".`,
    );
  }
  if (waitStrategy !== undefined && waitStrategy !== null) {
    if (!["networkidle", "load", "event", "selector"].includes(waitStrategy)) {
      throw new Error(
        `Invalid waitStrategy "${waitStrategy}". Expected "networkidle", "load", "event", or "selector".`,
      );
    }
  }
  if (waitEvent !== undefined && waitEvent !== null) {
    if (typeof waitEvent !== "string" || waitEvent.trim().length === 0) {
      throw new Error("waitEvent must be a non-empty string when provided.");
    }
  }
  if (waitSelector !== undefined && waitSelector !== null) {
    if (typeof waitSelector !== "string" || waitSelector.trim().length === 0) {
      throw new Error("waitSelector must be a non-empty string when provided.");
    }
  }

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
 * Generate overview HTML from template and data
 */
function generateOverview(data, templatePath, outputPath, configData) {
  try {
    // Read template
    const templateContent = readFileSync(templatePath, "utf8");

    // Ensure output directory exists
    ensureDirectoryExists(dirname(outputPath));

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
    allSections.forEach((section) => {
      // Render template with data
      let renderedContent = "";
      try {
        renderedContent = engine.parseAndRenderSync(templateContent, {
          ...configData,
          files: data.filter((file) => {
            const filePath = path.normalize(file.path);
            const sectionPath = path.normalize(section.files);
            // Check if file is in the folder or any subfolder
            const fileDir = path.dirname(filePath);
            return fileDir === sectionPath || fileDir.startsWith(sectionPath + path.sep);
          }),
          currentSection: section,
          sidebarItems: encodeURIComponent(JSON.stringify(sidebarItems)),
        });
      } catch (error) {
        console.error(`Error rendering overview template:`, error);
        renderedContent = `<html><body><h1>Error rendering overview template</h1><p>${error.message}</p></body></html>`;
      }

      const finalOutputPath = outputPath.replace(
        "index.html",
        `${toSectionPageKey(section)}.html`
      );
      // Save file
      writeFileSync(finalOutputPath, renderedContent, "utf8");
      console.log(`Generated overview: ${finalOutputPath}`);
    });
  } catch (error) {
    console.error("Error generating overview HTML:", error);
    throw error;
  }
}

export {
  generateHtml,
  getAllFiles,
  extractFrontMatter,
  ensureDirectoryExists,
  startWebServer,
  takeScreenshots,
  generateOverview,
  readYaml,
};
