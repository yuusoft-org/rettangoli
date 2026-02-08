import { cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import {
  generateHtml,
  startWebServer,
  takeScreenshots,
  generateOverview,
  readYaml,
} from "../common.js";
import { validateVtConfig } from "../validation.js";
import { resolveGenerateOptions } from "./generate-options.js";

const libraryTemplatesPath = new URL("./templates", import.meta.url).pathname;
const libraryStaticPath = new URL("./static", import.meta.url).pathname;

/**
 * Main function that orchestrates the entire process
 */
async function main(options = {}) {
  const mainConfigPath = "rettangoli.config.yaml";
  const siteOutputPath = join(".rettangoli", "vt", "_site");

  let mainConfig;
  try {
    mainConfig = await readYaml(mainConfigPath);
  } catch (error) {
    throw new Error(`Unable to read "${mainConfigPath}": ${error.message}`, { cause: error });
  }

  const vtConfig = mainConfig?.vt;
  if (!vtConfig) {
    throw new Error(`Invalid "${mainConfigPath}": missing required "vt" section.`);
  }

  const configData = validateVtConfig(vtConfig, mainConfigPath);
  const resolvedOptions = resolveGenerateOptions(options, configData);
  const {
    vtPath,
    skipScreenshots,
    screenshotWaitTime,
    port,
    waitEvent,
    waitSelector,
    waitStrategy,
    workerCount,
    isolationMode,
    navigationTimeout,
    readyTimeout,
    screenshotTimeout,
    maxRetries,
    recycleEvery,
    metricsPath,
    headless,
    configUrl,
  } = resolvedOptions;

  const specsPath = join(vtPath, "specs");
  const candidatePath = join(siteOutputPath, "candidate");

  // Clear candidate directory
  await rm(candidatePath, { recursive: true, force: true });
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Copy static files from library to site directory
  await cp(libraryStaticPath, siteOutputPath, { recursive: true });

  // Copy user's static files if they exist
  const userStaticPath = join(vtPath, "static");
  if (existsSync(userStaticPath)) {
    await cp(userStaticPath, siteOutputPath, { recursive: true });
  }

  // Resolve template paths
  const localTemplatesPath = join(vtPath, "templates");
  const defaultTemplatePath = existsSync(join(localTemplatesPath, "default.html"))
    ? join(localTemplatesPath, "default.html")
    : join(libraryTemplatesPath, "default.html");
  const indexTemplatePath = existsSync(join(localTemplatesPath, "index.html"))
    ? join(localTemplatesPath, "index.html")
    : join(libraryTemplatesPath, "index.html");

  const templateConfig = {
    defaultTemplate: defaultTemplatePath,
    vtPath: vtPath,
  };

  // Generate HTML files
  const generatedFiles = await generateHtml(
    specsPath,
    defaultTemplatePath,
    candidatePath,
    templateConfig,
  );

  // Generate overview page (includes all files, skipped or not)
  generateOverview(
    generatedFiles,
    indexTemplatePath,
    join(siteOutputPath, "index.html"),
    configData,
  );

  // Take screenshots (only for non-skipped files)
  if (!skipScreenshots) {
    // Filter out files with skipScreenshot: true in frontmatter
    const filesToScreenshot = generatedFiles.filter(
      (file) => !file.frontMatter?.skipScreenshot
    );

    const skippedCount = generatedFiles.length - filesToScreenshot.length;
    if (skippedCount > 0) {
      console.log(`Skipping screenshots for ${skippedCount} files`);
    }

    const server = configUrl ? null : await startWebServer(siteOutputPath, vtPath, port);
    try {
      await takeScreenshots({
        generatedFiles: filesToScreenshot,
        serverUrl: `http://localhost:${port}`,
        screenshotsDir: candidatePath,
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
      });
    } finally {
      if (server) {
        server.close();
        console.log("Server stopped");
      }
    }
  }
}

export default main;
