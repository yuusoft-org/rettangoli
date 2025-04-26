import { cp, rm } from "node:fs/promises";
import {
  generateHtml,
  startWebServer,
  takeScreenshots,
  generateOverview,
} from "./common.js";

/**
 * Main function that orchestrates the entire process
 */
async function main() {
  await rm("./viz/_site", { recursive: true, force: true });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await cp("./viz/static", "./viz/_site", { recursive: true });

  // Generate HTML files
  const generatedFiles = generateHtml(
    "./specs",
    "./viz/templates/default.html",
    "./viz/_site/artifacts"
  );

  // Generate overview page with all files
  generateOverview(
    generatedFiles,
    "./viz/templates/index.html",
    "./viz/_site/index.html"
  );

  // Start web server
  const server = startWebServer("./viz/_site/artifacts", "./viz/_site", 3001);

  try {
    // Take screenshots with specified concurrency
    await takeScreenshots(
      generatedFiles,
      "http://localhost:3001",
      "./viz/_site/artifacts/screenshots",
      24
    );
  } finally {
    // Stop server
    server.stop();
    console.log("Server stopped");
  }
}

export default main;
