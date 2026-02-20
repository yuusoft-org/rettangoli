import { analyzeProject } from "../core/analyze.js";
import { createCompileArtifact } from "./artifact.js";
import { hashCompilerSemanticCore } from "./cache.js";
import { emitCompileArtifact } from "./emit.js";

export const compileProject = async ({
  cwd = process.cwd(),
  dirs = [],
  workspaceRoot = cwd,
  includeYahtml = true,
  includeExpression = true,
  outDir = ".rettangoli/compile",
  emitArtifact = true,
  cache = new Map(),
} = {}) => {
  const analysis = await analyzeProject({
    cwd,
    dirs,
    workspaceRoot,
    includeYahtml,
    includeExpression,
    includeSemantic: true,
    emitCompilerIr: true,
  });

  if (!analysis.compilerIr || !analysis.compilerIrValidation?.ok) {
    const reasons = analysis.compilerIrValidation?.errors || ["missing compiler IR"];
    throw new Error(`Compiler IR validation failed: ${reasons.join("; ")}`);
  }

  const semanticHash = hashCompilerSemanticCore({
    compilerIr: analysis.compilerIr,
    cwd,
  });
  const cachedArtifact = cache instanceof Map ? cache.get(semanticHash) : null;
  const artifact = cachedArtifact || createCompileArtifact({
    compilerIr: analysis.compilerIr,
    diagnostics: analysis.diagnostics,
    summary: analysis.summary,
    semanticHash,
    cwd,
    dirs: analysis.dirs,
  });

  if (cache instanceof Map && !cache.has(semanticHash)) {
    cache.set(semanticHash, artifact);
  }

  const emitResult = emitArtifact
    ? emitCompileArtifact({
      artifact,
      outDir,
    })
    : null;

  return {
    ok: analysis.ok,
    componentCount: analysis.componentCount,
    diagnostics: analysis.diagnostics,
    summary: analysis.summary,
    semanticHash,
    artifact,
    cacheHit: Boolean(cachedArtifact),
    emitted: emitResult,
  };
};
