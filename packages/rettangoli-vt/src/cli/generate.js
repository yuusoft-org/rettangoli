import { cp, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  generateHtml,
  startWebServer,
  takeScreenshots,
  generateOverview,
  readYaml,
} from "../common.js";

const libraryTemplatesPath = new URL('./templates', import.meta.url).pathname;


/**
 * Main function that orchestrates the entire process
 */
async function main(options) {
  const {
    skipScreenshots = false,
    vizPath = "./viz",
    screenshotWaitTime = 0,
    port = 3001
  } = options;

  const candidatePath = join(vizPath, "candidate");
  const specsPath = join(vizPath, "specs");
  const mainConfigPath = "rettangoli.config.yaml";
  
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

  // Generate HTML files
  const generatedFiles = await generateHtml(
    specsPath,
    join(libraryTemplatesPath, "default.html"),
    candidatePath
  );

  // Generate overview page with all files
  const siteOutputPath = join(".rettangoli", "vt", "_site");
  generateOverview(
    generatedFiles,
    join(libraryTemplatesPath, "index.html"),
    join(siteOutputPath, "index.html"),
    configData
  );

  if (!skipScreenshots) {
    // Start web server
    const server = startWebServer(
      candidatePath,
      vizPath,
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
      server.stop();
      console.log("Server stopped");
    }
  }

}

export default main;
