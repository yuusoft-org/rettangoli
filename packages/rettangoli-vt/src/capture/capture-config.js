import { join } from "node:path";
import { validateFiniteNumber } from "../validation.js";

/**
 * Builds the one frozen capture configuration that takeScreenshots consumes, from
 * resolveGenerateOptions' result, the files to capture, the built-in server's port and
 * the candidate directory. The defaults below never apply to `rtgl vt screenshot`,
 * because resolveGenerateOptions sets every field that has one.
 */
export function createCaptureConfig({
  resolvedOptions,
  generatedFiles,
  port,
  candidatePath,
}) {
  const {
    workerCount,
    screenshotWaitTime = 10,
    configUrl,
    waitEvent,
    waitSelector,
    waitStrategy,
    navigationTimeout = 30000,
    readyTimeout = 30000,
    screenshotTimeout = 30000,
    maxRetries = 2,
    recycleEvery = 0,
    isolationMode = "fast",
    metricsPath = join(".rettangoli", "vt", "metrics.json"),
    headless = true,
    viewport,
    launchArgs,
    animations,
  } = resolvedOptions;
  const screenshotsDir = candidatePath;

  if (!Array.isArray(generatedFiles)) {
    throw new Error("takeScreenshots: generatedFiles must be an array.");
  }
  if (typeof screenshotsDir !== "string" || screenshotsDir.trim().length === 0) {
    throw new Error("takeScreenshots: screenshotsDir must be a non-empty string.");
  }

  validateFiniteNumber(workerCount, "workerCount", { integer: true, min: 1 });
  validateFiniteNumber(screenshotWaitTime, "screenshotWaitTime", { integer: true, min: 0 });
  validateFiniteNumber(navigationTimeout, "navigationTimeout", { integer: true, min: 1 });
  validateFiniteNumber(readyTimeout, "readyTimeout", { integer: true, min: 1 });
  validateFiniteNumber(screenshotTimeout, "screenshotTimeout", { integer: true, min: 1 });
  validateFiniteNumber(maxRetries, "maxRetries", { integer: true, min: 0 });
  validateFiniteNumber(recycleEvery, "recycleEvery", { integer: true, min: 0 });

  if (!["strict", "fast"].includes(isolationMode)) {
    throw new Error(
      `Invalid isolationMode "${isolationMode}". Expected "strict" or "fast".`,
    );
  }
  if (waitStrategy !== undefined && waitStrategy !== null) {
    if (!["networkidle", "load", "event", "selector"].includes(waitStrategy)) {
      throw new Error(
        `Invalid waitStrategy "${waitStrategy}". Expected "networkidle", "load", "event", or "selector".`,
      );
    }
  }
  if (waitEvent !== undefined && waitEvent !== null) {
    if (typeof waitEvent !== "string" || waitEvent.trim().length === 0) {
      throw new Error("waitEvent must be a non-empty string when provided.");
    }
  }
  if (waitSelector !== undefined && waitSelector !== null) {
    if (typeof waitSelector !== "string" || waitSelector.trim().length === 0) {
      throw new Error("waitSelector must be a non-empty string when provided.");
    }
  }

  return Object.freeze({
    generatedFiles,
    serverUrl: `http://localhost:${port}`,
    screenshotsDir,
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
    launchArgs,
    animations,
  });
}
