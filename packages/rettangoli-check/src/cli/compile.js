import path from "node:path";
import { compileProject } from "../compiler/compile.js";
import { isDirectoryPath } from "../utils/fs.js";
import { validatePolicyPacks } from "./policy.js";

const formatCompileTextReport = ({
  result,
  warnAsError = false,
  mode = "strict",
  policyPackCount = 0,
}) => {
  const lines = [];
  lines.push(`[Compile] Components: ${result.componentCount}.`);
  lines.push(`[Compile] Errors: ${result.summary.bySeverity.error}, Warnings: ${result.summary.bySeverity.warn}.`);
  lines.push(`[Compile] Semantic hash: ${result.semanticHash}.`);
  lines.push(`[Compile] Cache hit: ${result.cacheHit ? "yes" : "no"}.`);
  if (result?.emitted?.artifactPath) {
    lines.push(`[Compile] Artifact: ${result.emitted.artifactPath}.`);
  }
  lines.push(`[Compile] Mode: ${mode}.`);
  lines.push(`[Compile] Policy packs: ${policyPackCount}.`);
  if (mode === "local-non-authoritative") {
    lines.push("[Compile] Non-authoritative mode: output is advisory and must not gate CI.");
  }
  if (result.diagnostics.length > 0) {
    lines.push("[Compile] Diagnostics:");
    result.diagnostics.forEach((diagnostic) => {
      const severity = warnAsError && diagnostic.severity === "warn" ? "error" : diagnostic.severity;
      lines.push(`${diagnostic.code} [${severity}] ${diagnostic.message}`);
    });
  } else {
    lines.push("[Compile] No issues found.");
  }
  return lines.join("\n");
};

export const compile = async (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = [],
    format = "text",
    warnAsError = false,
    includeYahtml = true,
    includeExpression = false,
    outDir = ".rettangoli/compile",
    emitArtifact = true,
    mode = "strict",
    policyPacks = [],
  } = options;

  if (mode === "local-non-authoritative" && process.env.CI === "true") {
    throw new Error("local-non-authoritative mode is not allowed in CI.");
  }

  const resolvedDirs = Array.isArray(dirs) && dirs.length > 0 ? dirs : ["./src/components"];
  const missingDirs = resolvedDirs.filter((dirPath) => !isDirectoryPath(path.resolve(cwd, dirPath)));
  if (missingDirs.length > 0) {
    throw new Error(`Component directories do not exist: ${missingDirs.join(", ")}`);
  }

  const validatedPolicyPacks = validatePolicyPacks({
    cwd,
    policyPacks,
  });

  const result = await compileProject({
    cwd,
    dirs: resolvedDirs,
    workspaceRoot: cwd,
    includeYahtml,
    includeExpression,
    outDir: path.resolve(cwd, outDir),
    emitArtifact,
  });

  const hasErrors = result.summary.bySeverity.error > 0;
  const hasWarnAsError = warnAsError && result.summary.bySeverity.warn > 0;
  process.exitCode = hasErrors || hasWarnAsError ? 1 : 0;

  const payload = {
    contractVersion: 1,
    ok: !hasErrors && !hasWarnAsError,
    command: "compile",
    mode,
    warnAsError,
    policyPacks: validatedPolicyPacks.map((entry) => ({
      name: entry.name,
      filePath: path.relative(cwd, entry.path),
      ruleCount: entry.ruleCount,
    })),
    componentCount: result.componentCount,
    summary: result.summary,
    semanticHash: result.semanticHash,
    cacheHit: result.cacheHit,
    artifactPath: result?.emitted?.artifactPath
      ? path.relative(cwd, result.emitted.artifactPath)
      : null,
    diagnostics: result.diagnostics,
  };

  if (format === "json") {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(formatCompileTextReport({
      result,
      warnAsError,
      mode,
      policyPackCount: validatedPolicyPacks.length,
    }));
  }

  return payload;
};

export default compile;
