import { validateFiniteNumber } from "../validation.js";

const COMPARE_METHODS = ["pixelmatch", "md5"];

export function resolveReportOptions(options = {}, configData = {}) {
  const {
    vtPath: cliVtPath,
    compareMethod: cliCompareMethod,
    colorThreshold: cliColorThreshold,
    diffThreshold: cliDiffThreshold,
  } = options;

  const resolvedOptions = {
    vtPath: cliVtPath ?? configData.path ?? "./vt",
    compareMethod: cliCompareMethod ?? configData.compareMethod ?? "pixelmatch",
    colorThreshold: cliColorThreshold ?? configData.colorThreshold ?? 0.1,
    diffThreshold: cliDiffThreshold ?? configData.diffThreshold ?? 0.3,
  };

  if (typeof resolvedOptions.vtPath !== "string" || resolvedOptions.vtPath.trim().length === 0) {
    throw new Error(`Invalid vtPath: expected a non-empty string, got "${resolvedOptions.vtPath}".`);
  }
  if (!COMPARE_METHODS.includes(resolvedOptions.compareMethod)) {
    throw new Error(
      `Invalid compareMethod "${resolvedOptions.compareMethod}". Expected "pixelmatch" or "md5".`,
    );
  }
  validateFiniteNumber(resolvedOptions.colorThreshold, "colorThreshold", { min: 0, max: 1 });
  validateFiniteNumber(resolvedOptions.diffThreshold, "diffThreshold", { min: 0, max: 100 });

  return resolvedOptions;
}
