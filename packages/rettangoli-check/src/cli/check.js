import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { analyzeProject } from "../core/analyze.js";
import { applyDiagnosticFixes } from "../diagnostics/autofix.js";
import { formatReport } from "../reporters/index.js";
import { isDirectoryPath } from "../utils/fs.js";

const readConfig = (cwd) => {
  const configPath = path.resolve(cwd, "rettangoli.config.yaml");
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf8");
    return loadYaml(content);
  } catch (err) {
    throw new Error(`Failed to read rettangoli.config.yaml: ${err.message}`);
  }
};

const resolveDirs = ({ cwd, dirs, config }) => {
  if (Array.isArray(dirs) && dirs.length > 0) {
    return dirs;
  }

  const configDirs = config?.fe?.dirs;
  if (Array.isArray(configDirs) && configDirs.length > 0) {
    return configDirs;
  }

  return ["./src/components"];
};

const toAutofixReport = ({
  autofixResult,
  mode = "off",
  includePatchText = false,
}) => {
  if (!autofixResult) {
    return undefined;
  }

  return {
    mode,
    dryRun: Boolean(autofixResult.dryRun),
    patchOutput: includePatchText,
    candidateCount: Number(autofixResult.candidateCount) || 0,
    appliedCount: Number(autofixResult.appliedCount) || 0,
    skippedCount: Number(autofixResult.skippedCount) || 0,
    patches: Array.isArray(autofixResult.patches)
      ? autofixResult.patches.map((patch) => ({
        code: patch.code,
        filePath: patch.filePath,
        line: patch.line,
        description: patch.description,
        confidence: patch.confidence,
        ...(includePatchText && typeof patch.patch === "string" ? { patch: patch.patch } : {}),
      }))
      : [],
  };
};

export const check = async (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = [],
    format = "text",
    warnAsError = false,
    includeYahtml = true,
    includeExpression = false,
    watch = false,
    watchIntervalMs = 800,
    autofixMode = "off",
    autofixMinConfidence = 0.9,
    autofixPatch = false,
  } = options;

  const config = readConfig(cwd);
  const resolvedDirs = resolveDirs({ cwd, dirs, config });
  const missingDirs = resolvedDirs.filter((dirPath) => !isDirectoryPath(path.resolve(cwd, dirPath)));
  const incrementalState = { componentCache: new Map() };

  if (missingDirs.length > 0) {
    throw new Error(`Component directories do not exist: ${missingDirs.join(", ")}`);
  }

  if (watch && autofixMode !== "off") {
    throw new Error("Autofix is not supported with --watch.");
  }

  const runAnalysis = async () => analyzeProject({
    cwd,
    dirs: resolvedDirs,
    workspaceRoot: cwd,
    includeYahtml,
    includeExpression,
    incrementalState,
  });

  const runOnce = async () => {
    const initialResult = await runAnalysis();
    let result = initialResult;

    let autofixResult = null;
    if (autofixMode !== "off") {
      autofixResult = applyDiagnosticFixes({
        diagnostics: initialResult.diagnostics,
        dryRun: autofixMode !== "apply",
        minConfidence: autofixMinConfidence,
        includePatchText: autofixPatch,
      });

      if (autofixMode === "apply" && autofixResult.appliedCount > 0) {
        result = await runAnalysis();
      }

      result = {
        ...result,
        autofix: toAutofixReport({
          autofixResult,
          mode: autofixMode,
          includePatchText: autofixPatch,
        }),
      };
    }

    const report = formatReport({
      format: (format === "json" || format === "sarif") ? format : "text",
      result,
      warnAsError,
    });

    const hasErrors = result.summary.bySeverity.error > 0;
    const hasWarnAsError = warnAsError && result.summary.bySeverity.warn > 0;
    process.exitCode = hasErrors || hasWarnAsError ? 1 : 0;

    return {
      result,
      report,
      hasErrors,
      hasWarnAsError,
    };
  };

  if (!watch) {
    const {
      result,
      report,
      hasErrors,
      hasWarnAsError,
    } = await runOnce();
    if (format === "json" || format === "sarif") {
      console.log(report);
    } else if (hasErrors || hasWarnAsError) {
      console.error(report);
    } else {
      console.log(report);
    }
    return result;
  }

  let lastSignature = null;
  let running = false;
  let stopped = false;
  let lastResult = null;
  const interval = Math.max(200, Number.isFinite(watchIntervalMs) ? Number(watchIntervalMs) : 800);

  const runWatchIteration = async () => {
    if (running || stopped) {
      return;
    }
    running = true;
    try {
      const { result, report } = await runOnce();
      const signature = JSON.stringify({
        summary: result.summary,
        diagnostics: result.diagnostics,
      });
      if (signature !== lastSignature) {
        if (lastSignature !== null && format === "text") {
          console.log("\n[Watch] Change detected.\n");
        }
        if (format === "json" || format === "sarif") {
          console.log(report);
        } else {
          const hasErrors = result.summary.bySeverity.error > 0;
          const hasWarnAsError = warnAsError && result.summary.bySeverity.warn > 0;
          if (hasErrors || hasWarnAsError) {
            console.error(report);
          } else {
            console.log(report);
          }
        }
        lastSignature = signature;
      }
      lastResult = result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (format === "text") {
        console.error(`[Watch] ${message}`);
      }
    } finally {
      running = false;
    }
  };

  await runWatchIteration();
  const timer = setInterval(runWatchIteration, interval);

  const stop = () => {
    stopped = true;
    clearInterval(timer);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await new Promise((resolve) => {
    const checkStopped = setInterval(() => {
      if (stopped) {
        clearInterval(checkStopped);
        resolve();
      }
    }, 100);
  });

  return lastResult;
};

export default check;
