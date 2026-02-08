import { join } from "node:path";
import { validateFiniteNumber } from "../validation.js";

export function resolveGenerateOptions(options = {}, configData = {}) {
  const {
    skipScreenshots: cliSkipScreenshots,
    vtPath: cliVtPath,
    port: cliPort,
    headless: cliHeadless,
    url: cliUrl,
  } = options;

  const resolvedOptions = {
    vtPath: cliVtPath ?? configData.path ?? "./vt",
    skipScreenshots: cliSkipScreenshots ? true : (configData.skipScreenshots ?? false),
    port: cliPort ?? configData.port ?? 3001,
    headless: cliHeadless ?? true,
    configUrl: cliUrl ?? configData.url,

    // Internal capture defaults (not user-configurable).
    screenshotWaitTime: 0,
    waitStrategy: "load",
    workerCount: undefined, // adaptive worker planning
    isolationMode: "fast",
    navigationTimeout: 30000,
    readyTimeout: 30000,
    screenshotTimeout: 30000,
    maxRetries: 1,
    recycleEvery: 25,
    metricsPath: join(".rettangoli", "vt", "metrics.json"),
  };

  if (typeof resolvedOptions.vtPath !== "string" || resolvedOptions.vtPath.trim().length === 0) {
    throw new Error(
      `Invalid vtPath: expected a non-empty string, got "${resolvedOptions.vtPath}".`,
    );
  }
  if (typeof resolvedOptions.skipScreenshots !== "boolean") {
    throw new Error(
      `Invalid skipScreenshots: expected a boolean, got ${typeof resolvedOptions.skipScreenshots}.`,
    );
  }
  validateFiniteNumber(resolvedOptions.port, "port", { integer: true, min: 1, max: 65535 });
  if (typeof resolvedOptions.headless !== "boolean") {
    throw new Error(`Invalid headless: expected a boolean, got ${typeof resolvedOptions.headless}.`);
  }
  if (resolvedOptions.configUrl !== undefined && resolvedOptions.configUrl !== null) {
    if (typeof resolvedOptions.configUrl !== "string" || resolvedOptions.configUrl.trim().length === 0) {
      throw new Error(`Invalid url: expected a non-empty string, got ${typeof resolvedOptions.configUrl}.`);
    }
  }

  return resolvedOptions;
}
