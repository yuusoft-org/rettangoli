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

const libraryTemplatesPath = new URL("./templates", import.meta.url).pathname;
const libraryStaticPath = new URL("./static", import.meta.url).pathname;

/**
 * Main function that orchestrates the entire process
 */
async function main(options) {
  const {
    skipScreenshots = false,
    vtPath = "./vt",
    screenshotWaitTime = 0,
    port = 3001,
  } = options;

  const specsPath = join(vtPath, "specs");
  const mainConfigPath = "rettangoli.config.yaml";
  const siteOutputPath = join(".rettangoli", "vt", "_site");
  const candidatePath = join(siteOutputPath, "candidate");

  // Read VT config from main rettangoli.config.yaml
  let configData = {};
  try {
    const mainConfig = await readYaml(mainConfigPath);
    configData = mainConfig.vt || {};
  } catch (error) {
    console.log("Main config file not found, using defaults");
  }

  const configUrl = configData.url;

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

    const server = configUrl ? null : startWebServer(siteOutputPath, vtPath, port);
    try {
      await takeScreenshots(
        filesToScreenshot,
        `http://localhost:${port}`,
        candidatePath,
        24,
        screenshotWaitTime,
        configUrl,
      );
    } finally {
      if (server) {
        server.close();
        console.log("Server stopped");
      }
    }
  }
}

export default main;
