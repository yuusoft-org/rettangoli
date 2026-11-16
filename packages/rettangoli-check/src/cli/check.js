import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { analyzeProject } from "../core/analyze.js";
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

// Reads the config and resolves the directories the way every check run does.
// Returns a function that analyzes the project; calls share one incremental
// cache, so a repeated run only re-reads the components that changed.
const createAnalysisRunner = ({
  cwd = process.cwd(),
  dirs = [],
  includeYahtml = true,
  includeStyle,
} = {}) => {
  const config = readConfig(cwd);
  const resolvedDirs = resolveDirs({ cwd, dirs, config });
  const missingDirs = resolvedDirs.filter((dirPath) => !isDirectoryPath(path.resolve(cwd, dirPath)));
  const incrementalState = { componentCache: new Map() };

  if (missingDirs.length > 0) {
    throw new Error(`Component directories do not exist: ${missingDirs.join(", ")}`);
  }

  return async () => analyzeProject({
    cwd,
    dirs: resolvedDirs,
    workspaceRoot: cwd,
    includeYahtml,
    includeStyle: includeStyle ?? config?.check?.style === true,
    incrementalState,
  });
};

// For tools that show check results inside their own output (rtgl fe build
// and rtgl fe watch). Takes the options of `check` that select what is
// analyzed (cwd, dirs, includeYahtml, includeStyle) and
// returns a function. Each call analyzes the project again and resolves to
// { result, report }: `report` is the text `check` would print, listing at
// most `maxDiagnostics` diagnostics when that is set. Other options of `check`
// (format, warnAsError, watch) are ignored. Nothing is printed and
// process.exitCode is left alone.
export const createChecker = (options = {}) => {
  const { maxDiagnostics } = options;
  const runAnalysis = createAnalysisRunner(options);

  return async () => {
    const result = await runAnalysis();
    return {
      result,
      report: formatReport({ format: "text", result, maxDiagnostics }),
    };
  };
};

export const check = async (options = {}) => {
  const {
    format = "text",
    warnAsError = false,
    watch = false,
    watchIntervalMs = 800,
  } = options;

  const runAnalysis = createAnalysisRunner(options);

  const runOnce = async () => {
    const result = await runAnalysis();

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
