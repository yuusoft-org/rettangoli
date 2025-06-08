import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { join, dirname, resolve, extname } from "path";
import { load as loadYaml } from "js-yaml";
import { Liquid } from "liquidjs";
import { chromium } from "playwright";
import { codeToHtml } from "shiki";
import path from "path";

const convertToHtmlExtension = (filePath) => {
  if (filePath.endsWith(".html")) {
    return filePath;
  }
  // Remove existing extension and add .html
  const baseName = filePath.replace(/\.[^/.]+$/, "");
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
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
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
async function generateHtml(specsDir, templatePath, outputDir) {
  try {
    // Initialize LiquidJS engine

    // Read template
    const templateContent = readFileSync(templatePath, "utf8");

    // Ensure output directory exists
    ensureDirectoryExists(outputDir);

    // Get all files from specs directory
    const allFiles = getAllFiles(specsDir);

    // Process each file
    const processedFiles = [];
    for (const filePath of allFiles) {
      const fileContent = readFileSync(filePath, "utf8");
      const { content, frontMatter } = extractFrontMatter(fileContent);
      const lang = filePath.includes(".yaml") ? "yaml" : "html";
      const contentShiki = await codeToHtml(content, {
        lang,
        theme: "slack-dark",
      });

      // Parse YAML frontmatter
      let frontMatterObj = null;
      if (frontMatter) {
        try {
          frontMatterObj = loadYaml(frontMatter);
        } catch (e) {
          console.error(`Error parsing frontmatter in ${filePath}:`, e.message);
        }
      }

      // Render template
      let renderedContent = "";
      try {
        renderedContent = engine.parseAndRenderSync(templateContent, {
          content: content,
          frontMatter: frontMatterObj || {},
        });
      } catch (error) {
        console.error(`Error rendering template for ${filePath}:`, error);
        renderedContent = `<html><body><h1>Error rendering template</h1><p>${error.message}</p><pre>${content}</pre></body></html>`;
      }

      // Get relative path from specs directory
      const relativePath = path.relative(specsDir, filePath);
      
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
    console.error("Error generating HTML:", error);
    throw error;
  }
}

/**
 * Start a web server to serve static files
 */
function startWebServer(artifactsDir, staticDir, port) {
  const server = Bun.serve({
    port: port,
    fetch(req) {
      const url = new URL(req.url);
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
        return new Response(fileContent, {
          headers: { "Content-Type": contentType },
        });
      }

      // Then try to serve from static directory
      const staticPath = join(staticDir, filePath);
      if (existsSync(staticPath) && statSync(staticPath).isFile()) {
        const fileContent = readFileSync(staticPath);
        const contentType = getContentType(staticPath);
        return new Response(fileContent, {
          headers: { "Content-Type": contentType },
        });
      }

      // If not found in either directory, return 404
      return new Response("Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    },
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

/**
 * Take screenshots of all generated HTML files
 */
async function takeScreenshots(
  generatedFiles,
  serverUrl,
  screenshotsDir,
  concurrency = 8,
  waitTime = 0
) {
  // Ensure screenshots directory exists
  ensureDirectoryExists(screenshotsDir);

  // Launch browser
  console.log("Launching browser to take screenshots...");
  const browser = await chromium.launch();

  try {
    // Process files in parallel with limited concurrency
    const files = [...generatedFiles]; // Create a copy to work with
    const total = files.length;
    let completed = 0;

    // Process files in batches based on concurrency
    while (files.length > 0) {
      const batch = files.splice(0, concurrency);
      const batchPromises = batch.map(async (file) => {
        // Create a new context and page for each file (for parallelism)
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
          // Construct URL from file path
          const fileUrl = convertToHtmlExtension(
            `${serverUrl}/${file.path.replace(/\\/g, '/')}`
          );
          console.log(`Taking screenshot of ${fileUrl}`);

          // Navigate to the page
          await page.goto(fileUrl, { waitUntil: "networkidle" });

          // Create screenshot output path (remove extension and add .png)
          const baseName = file.path.replace(/\.[^/.]+$/, "");
          const screenshotPath = join(screenshotsDir, `${baseName}.png`);
          ensureDirectoryExists(dirname(screenshotPath));

          if (waitTime > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }

          // Take screenshot
          await page.screenshot({ path: `${screenshotPath}`, fullPage: true });

          // example instructions:
          for (const instruction of file.frontMatter?.instructions || []) {
            const [command, ...args] = instruction.split(" ");
            switch (command) {
              case "lc":
                const x = Number(args[0]);
                const y = Number(args[1]);
                await page.mouse.click(x, y, {
                  button: "left",
                });
                break;
              case "ss":
                const baseName = file.path.replace(/\.[^/.]+$/, "");
                const additonalScreenshotPath = join(
                  screenshotsDir,
                  `${baseName}-${args[0]}.png`
                );
                console.log(`Taking additional screenshot at ${additonalScreenshotPath}`);
                await page.screenshot({
                  path: `${additonalScreenshotPath}`,
                  fullPage: true,
                });
                console.log(
                  `Additional screenshot taken at ${additonalScreenshotPath}`
                );
                break;
            }
          }

          completed++;
          console.log(
            `Screenshot saved: ${screenshotPath} (${completed}/${total})`
          );
        } catch (error) {
          console.error(`Error taking screenshot for ${file.path}:`, error);
        } finally {
          // Close the context when done
          await context.close();
        }
      });

      // Wait for current batch to complete before processing next batch
      await Promise.all(batchPromises);
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

    configData.sections.forEach((section) => {
      // Render template with data
      let renderedContent = "";
      try {
        renderedContent = engine.parseAndRenderSync(templateContent, {
          ...configData,
          files: data.filter((file) => {
            const filePath = path.normalize(file.path);
            const sectionPath = path.normalize(section.files);
            return filePath.startsWith(sectionPath);
          }),
          currentSection: section,
          sidebarItems: encodeURIComponent(
            JSON.stringify(
              configData.sections.map((item) => {
                return {
                  ...item,
                  href: `/${item.title.toLowerCase().replace(/\s+/g, "-")}`,
                };
              })
            )
          ),
        });
      } catch (error) {
        console.error(`Error rendering overview template:`, error);
        renderedContent = `<html><body><h1>Error rendering overview template</h1><p>${error.message}</p></body></html>`;
      }

      const finalOutputPath = outputPath.replace(
        "index.html",
        `${section.title.toLowerCase()}.html`
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
