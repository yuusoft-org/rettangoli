import { cp, rm } from "node:fs/promises";
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

  const outputPath = `${vizPath}/_site`;
  const staticPath = `${vizPath}/static`;
  const templatesPath = `${vizPath}/templates`;
  const specsPath = `${vizPath}/specs`;
  const configPath = `${vizPath}/config.yaml`;
  const configData = await readYaml(configPath);

  await rm(outputPath, { recursive: true, force: true });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await cp(staticPath, outputPath, { recursive: true });

  // Generate HTML files
  const generatedFiles = await generateHtml(
    specsPath,
    `${templatesPath}/default.html`,
    `${outputPath}/artifacts`
  );

  // Generate overview page with all files
  generateOverview(
    generatedFiles,
    `${libraryTemplatesPath}/index.html`,
    `${outputPath}/index.html`,
    configData
  );

  if (!skipScreenshots) {
    // Start web server
    const server = startWebServer(
      `${outputPath}/artifacts`,
      outputPath,
      port
    );
    try {
      // Take screenshots with specified concurrency
      await takeScreenshots(
        generatedFiles,
        `http://localhost:${port}`,
        `${outputPath}/artifacts/screenshots`,
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
