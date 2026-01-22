import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from "fs";
import { join, dirname, resolve, extname } from "path";
import http from "http";
import { load as loadYaml } from "js-yaml";
import { Liquid } from "liquidjs";
import { chromium } from "playwright";
import { codeToHtml } from "shiki";
import sharp from "sharp";
import path from "path";
import { createSteps } from "./createSteps.js";

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

      let templateToUse = defaultTemplateContent;
      const resolvedTemplatePath = frontMatterObj?.template ?
        join(templateConfig.vtPath, "templates", frontMatterObj.template) :
        templateConfig.defaultTemplate;
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
    throw new Error("Error generating HTML:", error);
  }
}

/**
 * Start a web server to serve static files
 */
function startWebServer(artifactsDir, staticDir, port) {
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

  server.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
  });

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

/**
 * Take screenshots of all generated HTML files
 */
async function takeScreenshots(
  generatedFiles,
  serverUrl,
  screenshotsDir,
  concurrency = 8,
  waitTime = 10,
  configUrl = undefined,
  waitEvent = undefined,
) {
  // Ensure screenshots directory exists
  ensureDirectoryExists(screenshotsDir);

  // Launch browser
  console.log("Launching browser to take screenshots...");
  const browser = await chromium.launch();

  const takeAndSaveScreenshot = async (page, basePath, suffix = "") => {
    const finalPath = suffix ? `${basePath}-${suffix}` : basePath;
    const tempPngPath = join(screenshotsDir, `${finalPath}.png`);
    const screenshotPath = join(screenshotsDir, `${finalPath}.webp`);
    ensureDirectoryExists(dirname(screenshotPath));

    // Check if custom screenshot function is available
    const hasCustomScreenshot = await page.evaluate(() => typeof window.takeVtScreenshotBase64 === 'function');

    if (hasCustomScreenshot) {
      // Use custom screenshot function (useful for canvas-based apps)
      let base64Data = await page.evaluate(() => window.takeVtScreenshotBase64());
      // Strip data URL prefix if present (e.g., "data:image/png;base64,")
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      const pngBuffer = Buffer.from(base64Data, 'base64');
      await sharp(pngBuffer).webp({ quality: 85 }).toFile(screenshotPath);
    } else {
      // Use Playwright's built-in screenshot
      await page.screenshot({ path: tempPngPath, fullPage: true });
      await sharp(tempPngPath).webp({ quality: 85 }).toFile(screenshotPath);

      if (existsSync(tempPngPath)) {
        unlinkSync(tempPngPath);
      }
    }
    return screenshotPath;
  };

  const processFile = async (file, browser, serverUrl, screenshotsDir, waitTime, configUrl, waitEvent, takeAndSaveScreenshot) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const envVars = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('RTGL_VT_')) {
          envVars[key] = value;
        }
      }

      if (Object.keys(envVars).length > 0) {
        await page.addInitScript((vars) => {
          Object.assign(window, vars);
        }, envVars);
      }

      // If using custom wait event, set up listener before navigation
      if (waitEvent) {
        await page.addInitScript((eventName) => {
          window.__vtReadyFired = false;
          window.addEventListener(eventName, () => {
            window.__vtReadyFired = true;
          }, { once: true });
        }, waitEvent);
      }

      const frontMatterUrl = file.frontMatter?.url;
      const constructedUrl = convertToHtmlExtension(`${serverUrl}/candidate/${file.path.replace(/\\/g, "/")}`);
      const url = frontMatterUrl ?? configUrl ?? constructedUrl;
      const fileUrl = url.startsWith("http") ? url : new URL(url, serverUrl).href;

      console.log(`Navigating to ${fileUrl}`);

      if (waitEvent) {
        // Navigate and wait for custom event
        await page.goto(fileUrl, { waitUntil: "load" });
        console.log(`Waiting for custom event: ${waitEvent}`);
        await page.waitForFunction(() => window.__vtReadyFired === true, { timeout: 30000 });
      } else {
        // Default: wait for network idle
        await page.goto(fileUrl, { waitUntil: "networkidle" });
      }

      // Normalize font rendering for consistent screenshots
      await page.addStyleTag({
        content: `
          * {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: geometricPrecision !important;
          }
        `
      });

      if (waitTime > 0) {
        await page.waitForTimeout(waitTime);
      }
      const baseName = removeExtension(file.path);

      const initialScreenshotPath = await takeAndSaveScreenshot(page, baseName);
      console.log(`Screenshot saved: ${initialScreenshotPath}`);

      const stepContext = {
        baseName,
        takeAndSaveScreenshot,
      };
      const stepsExecutor = createSteps(page, stepContext);

      for (const step of file.frontMatter?.steps || []) {
        await stepsExecutor.executeStep(step);
      }
      return { success: true, file };
    } finally {
      await context.close();
    }
  };

  try {
    const total = generatedFiles.length;
    let completed = 0;
    let filesToProcess = [...generatedFiles];
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries && filesToProcess.length > 0; attempt++) {
      if (attempt > 1) {
        console.log(`\nRetry attempt ${attempt}/${maxRetries} for ${filesToProcess.length} failed files...`);
      }

      const failedFiles = [];

      // Process files in batches based on concurrency
      while (filesToProcess.length > 0) {
        const batch = filesToProcess.splice(0, concurrency);
        const batchPromises = batch.map((file) =>
          processFile(file, browser, serverUrl, screenshotsDir, waitTime, configUrl, waitEvent, takeAndSaveScreenshot)
            .then(() => {
              completed++;
              console.log(`Finished processing ${file.path} (${completed}/${total})`);
              return { success: true, file };
            })
            .catch((error) => {
              console.error(`Error processing ${file.path}:`, error.message);
              return { success: false, file };
            })
        );

        const results = await Promise.allSettled(batchPromises);
        for (const result of results) {
          if (result.status === 'fulfilled' && !result.value.success) {
            failedFiles.push(result.value.file);
          } else if (result.status === 'rejected') {
            // This shouldn't happen since we catch errors above, but just in case
            console.error('Unexpected rejection:', result.reason);
          }
        }
      }

      filesToProcess = failedFiles;
    }

    if (filesToProcess.length > 0) {
      console.error(`\nFailed to process ${filesToProcess.length} files after ${maxRetries} attempts:`);
      filesToProcess.forEach((file) => console.error(`  - ${file.path}`));
    }
  } catch (error) {
    console.error("Error taking screenshots:", error);
  } finally {
    // Close browser
    await browser.close();
    console.log("Browser closed");
  }
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
            id: item.title.toLowerCase().replace(/\s+/g, "-"),
            title: item.title,
            href: `/${item.title.toLowerCase().replace(/\s+/g, "-")}.html`,
          })),
        };
      } else {
        // Flat item (backwards compatibility)
        return {
          id: section.title.toLowerCase().replace(/\s+/g, "-"),
          title: section.title,
          href: `/${section.title.toLowerCase().replace(/\s+/g, "-")}.html`,
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
        `${section.title.toLowerCase().replace(/\s+/g, "-")}.html`
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
