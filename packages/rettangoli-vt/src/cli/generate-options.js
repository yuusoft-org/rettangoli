import { join } from "node:path";
import { validateFiniteNumber } from "../validation.js";

export function resolveGenerateOptions(options = {}, configData = {}) {
  const {
    skipScreenshots: cliSkipScreenshots,
    vtPath: cliVtPath,
    port: cliPort,
    concurrency: cliConcurrency,
    timeout: cliTimeout,
    waitEvent: cliWaitEvent,
    headless: cliHeadless,
    url: cliUrl,
  } = options;

  const waitEvent = cliWaitEvent ?? configData.waitEvent;
  const timeout = cliTimeout ?? configData.timeout ?? 30000;

  const resolvedOptions = {
    vtPath: cliVtPath ?? configData.path ?? "./vt",
    skipScreenshots: cliSkipScreenshots ? true : (configData.skipScreenshots ?? false),
    port: cliPort ?? configData.port ?? 3001,
    waitEvent,
    headless: cliHeadless ?? true,
    configUrl: cliUrl ?? configData.url,

    // Internal capture defaults (not user-configurable).
    screenshotWaitTime: 0,
    waitStrategy: waitEvent ? "event" : "load",
    workerCount: cliConcurrency ?? configData.concurrency ?? undefined, // adaptive worker planning
    isolationMode: "fast",
    navigationTimeout: timeout,
    readyTimeout: timeout,
    screenshotTimeout: timeout,
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
  if (resolvedOptions.workerCount !== undefined && resolvedOptions.workerCount !== null) {
    validateFiniteNumber(resolvedOptions.workerCount, "concurrency", { integer: true, min: 1 });
  }
  validateFiniteNumber(resolvedOptions.navigationTimeout, "timeout", { integer: true, min: 1 });
  if (typeof resolvedOptions.headless !== "boolean") {
    throw new Error(`Invalid headless: expected a boolean, got ${typeof resolvedOptions.headless}.`);
  }
  if (resolvedOptions.waitEvent !== undefined && resolvedOptions.waitEvent !== null) {
    if (typeof resolvedOptions.waitEvent !== "string" || resolvedOptions.waitEvent.trim().length === 0) {
      throw new Error(`Invalid waitEvent: expected a non-empty string, got ${typeof resolvedOptions.waitEvent}.`);
    }
  }
  if (resolvedOptions.configUrl !== undefined && resolvedOptions.configUrl !== null) {
    if (typeof resolvedOptions.configUrl !== "string" || resolvedOptions.configUrl.trim().length === 0) {
      throw new Error(`Invalid url: expected a non-empty string, got ${typeof resolvedOptions.configUrl}.`);
    }
  }

  return resolvedOptions;
}
