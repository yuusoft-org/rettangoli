import { rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startWebServer, takeScreenshots } from "../common.js";
import { readVtConfig } from "../config/load-vt-config.js";
import { resolveGenerateOptions } from "./generate-options.js";
import {
  filterGeneratedFilesBySelectors,
  hasSelectors,
} from "../selector-filter.js";
import {
  installInterruptCleanup,
  startManagedService,
  stopManagedService,
  waitForServiceReady,
} from "./service-runtime.js";
import { writeCaptureManifest } from "../capture-manifest.js";
import { createCaptureConfig } from "../capture/capture-config.js";
import { copySiteStatic, renderSite, resolveTemplatePaths } from "../site/build-site.js";

const libraryTemplatesPath = fileURLToPath(new URL("./templates", import.meta.url));
const libraryStaticPath = fileURLToPath(new URL("./static", import.meta.url));

/**
 * Main function that orchestrates the entire process
 */
async function main(options = {}) {
  const mainConfigPath = "rettangoli.config.yaml";
  const siteOutputPath = join(".rettangoli", "vt", "_site");

  const configData = await readVtConfig(mainConfigPath, { wrapReadError: true });
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

  await copySiteStatic(siteOutputPath, {
    libraryStaticPath,
    userStaticPath: join(vtPath, "static"),
  });

  // The overview pages list every spec, selected or not; an overview template error becomes an
  // error page.
  let scopedFiles;
  await renderSite({
    specsPath,
    candidateDir: candidatePath,
    siteDir: siteOutputPath,
    templatePaths: resolveTemplatePaths(vtPath, libraryTemplatesPath),
    vtPath,
    configData,
    beforeOverview: (generatedFiles) => {
      scopedFiles = filterGeneratedFilesBySelectors(
        generatedFiles,
        resolvedOptions.selectors,
        configData.sections,
      );
      if (hasSelectors(resolvedOptions.selectors)) {
        const excludedCount = generatedFiles.length - scopedFiles.length;
        console.log(`Selector scope: ${scopedFiles.length} file(s) selected, ${excludedCount} excluded.`);
      }
    },
  });

  writeCaptureManifest(candidatePath, {
    screenshots: !skipScreenshots,
    selectors: resolvedOptions.selectors,
    sections: configData.sections,
  });

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
        // These handlers cover readiness only. Later, Playwright's SIGINT handler exits the process and
        // the exit listener from startManagedService stops the service; otherwise the finally below stops it.
        const disposeInterruptCleanup = installInterruptCleanup(managedService);
        try {
          await waitForServiceReady({ url: configUrl, handle: managedService });
        } finally {
          disposeInterruptCleanup();
        }
      } else if (!configUrl) {
        server = await startWebServer(siteOutputPath, vtPath, port);
      }

      await takeScreenshots(
        createCaptureConfig({
          resolvedOptions,
          generatedFiles: filesToScreenshot,
          port,
          candidatePath,
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
