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

/**
 * Get all files from a directory recursively
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
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
function generateHtml(specsDir, templatePath, outputDir) {
  try {
    // Initialize LiquidJS engine
    const engine = new Liquid();

    // Read template
    const templateContent = readFileSync(templatePath, "utf8");

    // Ensure output directory exists
    ensureDirectoryExists(outputDir);

    // Get all files from specs directory
    const allFiles = getAllFiles(specsDir);

    // Process each file
    const processedFiles = allFiles.map((filePath) => {
      const fileContent = readFileSync(filePath, "utf8");
      const { content, frontMatter } = extractFrontMatter(fileContent);

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

      // Save file
      const outputPath = join(outputDir, filePath);
      ensureDirectoryExists(dirname(outputPath));
      writeFileSync(outputPath, renderedContent, "utf8");
      console.log(`Generated: ${outputPath}`);

      return {
        path: filePath,
        content,
        frontMatter: frontMatterObj,
        fullContent: fileContent,
        renderedContent,
      };
    });

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
  concurrency = 8
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
          const fileUrl = `${serverUrl}/artifacts/${file.path}`;
          console.log(`Taking screenshot of ${fileUrl}`);

          // Navigate to the page
          await page.goto(fileUrl, { waitUntil: "networkidle" });

          // Create screenshot output path
          const screenshotPath = join(screenshotsDir, `${file.path}.png`);
          ensureDirectoryExists(dirname(screenshotPath));

          // Take screenshot
          await page.screenshot({ path: `${screenshotPath}`, fullPage: true });

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
 * Ensure directory exists
 */
function ensureDirectoryExists(dirPath) {
  const absolutePath = resolve(dirPath);
  if (!existsSync(absolutePath)) {
    mkdirSync(absolutePath, { recursive: true });
  }
}

/**
 * Generate overview HTML from template and data
 */
function generateOverview(
  data,
  templatePath,
  outputPath
) {
  try {
    // Initialize LiquidJS engine
    const engine = new Liquid();

    // Read template
    const templateContent = readFileSync(templatePath, "utf8");

    // Ensure output directory exists
    ensureDirectoryExists(dirname(outputPath));

    // Render template with data
    let renderedContent = "";
    try {
      renderedContent = engine.parseAndRenderSync(templateContent, {
        files: data,
      });
    } catch (error) {
      console.error(`Error rendering overview template:`, error);
      renderedContent = `<html><body><h1>Error rendering overview template</h1><p>${error.message}</p></body></html>`;
    }

    // Save file
    writeFileSync(outputPath, renderedContent, "utf8");
    console.log(`Generated overview: ${outputPath}`);

    return outputPath;
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
};
