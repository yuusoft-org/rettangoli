import { join } from "node:path";
import { validateFiniteNumber } from "../validation.js";

const WAIT_STRATEGIES = ["networkidle", "load", "event", "selector"];
const ISOLATION_MODES = ["strict", "fast"];

function validateOptionalNonEmptyString(value, fieldName) {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Invalid ${fieldName}: expected a non-empty string, got ${typeof value}.`,
    );
  }
}

function validateOptionalEnum(value, fieldName, allowedValues) {
  if (value === undefined || value === null) {
    return;
  }
  if (!allowedValues.includes(value)) {
    throw new Error(
      `Invalid ${fieldName} "${value}". Expected ${allowedValues.map((item) => `"${item}"`).join(", ")}.`,
    );
  }
}

export function resolveGenerateOptions(options = {}, configData = {}) {
  const {
    skipScreenshots: cliSkipScreenshots,
    vtPath: cliVtPath,
    screenshotWaitTime: cliScreenshotWaitTime,
    port: cliPort,
    waitEvent: cliWaitEvent,
    waitSelector: cliWaitSelector,
    waitStrategy: cliWaitStrategy,
    workers: cliWorkers,
    isolationMode: cliIsolationMode,
    navigationTimeout: cliNavigationTimeout,
    readyTimeout: cliReadyTimeout,
    screenshotTimeout: cliScreenshotTimeout,
    maxRetries: cliMaxRetries,
    recycleEvery: cliRecycleEvery,
    metricsPath: cliMetricsPath,
    headless: cliHeadless,
    url: cliUrl,
  } = options;

  const captureConfig = configData.capture || {};
  const resolvedOptions = {
    vtPath: cliVtPath ?? configData.path ?? "./vt",
    skipScreenshots: cliSkipScreenshots ? true : (configData.skipScreenshots ?? false),
    screenshotWaitTime: cliScreenshotWaitTime
      ?? captureConfig.screenshotWaitTime
      ?? 0,
    port: cliPort ?? configData.port ?? 3001,
    waitEvent: cliWaitEvent ?? captureConfig.waitEvent,
    waitSelector: cliWaitSelector ?? captureConfig.waitSelector,
    waitStrategy: cliWaitStrategy ?? captureConfig.waitStrategy,
    workerCount: cliWorkers ?? captureConfig.workerCount,
    isolationMode: cliIsolationMode ?? captureConfig.isolationMode ?? "fast",
    navigationTimeout: cliNavigationTimeout ?? captureConfig.navigationTimeout ?? 30000,
    readyTimeout: cliReadyTimeout ?? captureConfig.readyTimeout ?? 30000,
    screenshotTimeout: cliScreenshotTimeout ?? captureConfig.screenshotTimeout ?? 30000,
    maxRetries: cliMaxRetries ?? captureConfig.maxRetries ?? 2,
    recycleEvery: cliRecycleEvery ?? captureConfig.recycleEvery ?? 0,
    metricsPath: cliMetricsPath
      ?? captureConfig.metricsPath
      ?? join(".rettangoli", "vt", "metrics.json"),
    headless: cliHeadless ?? captureConfig.headless ?? true,
    configUrl: cliUrl ?? configData.url,
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
  validateFiniteNumber(resolvedOptions.screenshotWaitTime, "screenshotWaitTime", { integer: true, min: 0 });
  validateFiniteNumber(resolvedOptions.port, "port", { integer: true, min: 1, max: 65535 });
  validateFiniteNumber(resolvedOptions.workerCount, "workerCount", { integer: true, min: 1 });
  validateFiniteNumber(resolvedOptions.navigationTimeout, "navigationTimeout", { integer: true, min: 1 });
  validateFiniteNumber(resolvedOptions.readyTimeout, "readyTimeout", { integer: true, min: 1 });
  validateFiniteNumber(resolvedOptions.screenshotTimeout, "screenshotTimeout", { integer: true, min: 1 });
  validateFiniteNumber(resolvedOptions.maxRetries, "maxRetries", { integer: true, min: 0 });
  validateFiniteNumber(resolvedOptions.recycleEvery, "recycleEvery", { integer: true, min: 0 });

  validateOptionalNonEmptyString(resolvedOptions.waitEvent, "waitEvent");
  validateOptionalNonEmptyString(resolvedOptions.waitSelector, "waitSelector");
  validateOptionalNonEmptyString(resolvedOptions.configUrl, "url");
  validateOptionalEnum(resolvedOptions.waitStrategy, "waitStrategy", WAIT_STRATEGIES);
  validateOptionalEnum(resolvedOptions.isolationMode, "isolationMode", ISOLATION_MODES);

  if (resolvedOptions.waitStrategy === "event" && !resolvedOptions.waitEvent) {
    throw new Error(`Invalid waitStrategy "event": waitEvent must be provided.`);
  }
  if (resolvedOptions.waitStrategy === "selector" && !resolvedOptions.waitSelector) {
    throw new Error(`Invalid waitStrategy "selector": waitSelector must be provided.`);
  }
  if (typeof resolvedOptions.headless !== "boolean") {
    throw new Error(`Invalid headless: expected a boolean, got ${typeof resolvedOptions.headless}.`);
  }

  return resolvedOptions;
}
