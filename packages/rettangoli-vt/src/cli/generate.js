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

const libraryTemplatesPath = new URL('./templates', import.meta.url).pathname;
const libraryStaticPath = new URL('./static', import.meta.url).pathname;


/**
 * Main function that orchestrates the entire process
 */
async function main(options) {
  const {
    skipScreenshots = false,
    vtPath = "./vt",
    screenshotWaitTime = 0,
    port = 3001
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

  // Check for local templates first, fallback to library templates
  const localTemplatesPath = join(vtPath, "templates");

  let defaultTemplatePath = existsSync(join(localTemplatesPath, "default.html"))
      ? join(localTemplatesPath, "default.html")
      : join(libraryTemplatesPath, "default.html");

  // Resolve index template path
  let indexTemplatePath = existsSync(join(localTemplatesPath, "index.html"))
      ? join(localTemplatesPath, "index.html")
      : join(libraryTemplatesPath, "index.html");

  // Build template configuration for per-file/section templates
  const templateConfig = {
    defaultTemplate: defaultTemplatePath,
    vtPath: vtPath,
  };

  // Generate HTML files
  const generatedFiles = await generateHtml(
    specsPath,
    defaultTemplatePath,
    candidatePath,
    templateConfig
  );

  // Generate overview page with all files
  generateOverview(
    generatedFiles,
    indexTemplatePath,
    join(siteOutputPath, "index.html"),
    configData
  );

  if (!skipScreenshots) {
    // Start web server from site output path to serve both /public and /candidate
    const server = startWebServer(
      siteOutputPath,
      vtPath,
      port
    );
    try {
      // Take screenshots with specified concurrency
      await takeScreenshots(
        generatedFiles,
        `http://localhost:${port}`,
        candidatePath,
        24,
        screenshotWaitTime
      );
    } finally {
      // Stop server
      server.close();
      console.log("Server stopped");
    }
  }

}

export default main;
