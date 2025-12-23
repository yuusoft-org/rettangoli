import { cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  generateHtml,
  startWebServer,
  takeScreenshots,
  generateOverview,
  readYaml,
  getAllFiles,
  extractFrontMatter,
} from "../common.js";
import { load as loadYaml } from "js-yaml";
import path from "path";

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

  const appUrl = configData.url;

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

  if (appUrl) {
    console.log(`Using base URL: ${appUrl}`);
    const allFiles = getAllFiles(specsPath);
    const processedFiles = [];
    for (const filePath of allFiles) {
      const fileContent = readFileSync(filePath, "utf8");
      const { frontMatter } = extractFrontMatter(fileContent);
      const frontMatterObj = frontMatter ? loadYaml(frontMatter) : null;
      const relativePath = path.relative(specsPath, filePath);
      processedFiles.push({
        path: relativePath,
        frontMatter: frontMatterObj,
      });
    }

    console.log(`Found ${processedFiles.length} spec files to test.`);

    if (!skipScreenshots) {
      await takeScreenshots(
        processedFiles,
        appUrl,
        candidatePath,
        24,
        screenshotWaitTime,
        true,
      );
    }
  } else {
    // Static Site Mode (existing logic)
    const localTemplatesPath = join(vtPath, "templates");

    const defaultTemplatePath = existsSync(
      join(localTemplatesPath, "default.html"),
    )
      ? join(localTemplatesPath, "default.html")
      : join(libraryTemplatesPath, "default.html");

    // Resolve index template path
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

    // Generate overview page with all files
    generateOverview(
      generatedFiles,
      indexTemplatePath,
      join(siteOutputPath, "index.html"),
      configData,
    );

    if (!skipScreenshots) {
      const server = startWebServer(siteOutputPath, vtPath, port);
      try {
        await takeScreenshots(
          generatedFiles,
          `http://localhost:${port}`,
          candidatePath,
          24,
          screenshotWaitTime,
        );
      } finally {
        server.close();
        console.log("Server stopped");
      }
    }
  }
}

export default main;
