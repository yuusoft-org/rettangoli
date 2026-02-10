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
import {
  filterGeneratedFilesBySelectors,
  hasSelectors,
} from "../selector-filter.js";
import {
  startManagedService,
  stopManagedService,
  waitForServiceReady,
} from "./service-runtime.js";

const libraryTemplatesPath = new URL("./templates", import.meta.url).pathname;
const libraryStaticPath = new URL("./static", import.meta.url).pathname;

export function buildCaptureOptions({
  filesToScreenshot,
  port,
  candidatePath,
  resolvedOptions,
}) {
  const {
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
    viewport,
  } = resolvedOptions;

  return {
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
    viewport,
  };
}

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
    port,
    configUrl,
    serviceStart,
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

  const scopedFiles = filterGeneratedFilesBySelectors(
    generatedFiles,
    resolvedOptions.selectors,
    configData.sections,
  );
  if (hasSelectors(resolvedOptions.selectors)) {
    const excludedCount = generatedFiles.length - scopedFiles.length;
    console.log(`Selector scope: ${scopedFiles.length} file(s) selected, ${excludedCount} excluded.`);
  }

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
    const filesToScreenshot = scopedFiles.filter(
      (file) => !file.frontMatter?.skipScreenshot
    );

    const skippedCount = scopedFiles.length - filesToScreenshot.length;
    if (skippedCount > 0) {
      console.log(`Skipping screenshots for ${skippedCount} files`);
    }
    if (filesToScreenshot.length === 0) {
      console.log("No files selected for screenshot capture. Skipping Playwright run.");
      return;
    }

    let server = null;
    let managedService = null;

    try {
      if (serviceStart) {
        if (!configUrl) {
          throw new Error(
            "vt.service.start requires vt.url (or --url) so VT can wait for readiness and capture against that URL.",
          );
        }
        managedService = startManagedService({ command: serviceStart });
        await waitForServiceReady({ url: configUrl, handle: managedService });
      } else if (!configUrl) {
        server = await startWebServer(siteOutputPath, vtPath, port);
      }

      await takeScreenshots(
        buildCaptureOptions({
          filesToScreenshot,
          port,
          candidatePath,
          resolvedOptions,
        }),
      );
    } finally {
      if (server) {
        server.close();
        console.log("Server stopped");
      }
      if (managedService) {
        await stopManagedService(managedService);
      }
    }
  }
}

export default main;
