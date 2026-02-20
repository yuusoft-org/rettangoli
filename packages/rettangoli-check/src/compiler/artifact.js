import { canonicalizeIrValue } from "../ir/serialize.js";
import path from "node:path";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const toRelativePath = ({ cwd = process.cwd(), filePath = "unknown" }) => {
  const normalized = String(filePath || "unknown");
  if (normalized === "unknown") {
    return "unknown";
  }
  if (!path.isAbsolute(normalized)) {
    return normalized.replaceAll("\\", "/");
  }
  return path.relative(cwd, normalized).replaceAll("\\", "/");
};

const toDiagnosticRows = ({ diagnostics = [], cwd }) => {
  return safeArray(diagnostics)
    .map((diagnostic) => ({
      code: String(diagnostic?.code || "RTGL-CHECK-UNKNOWN"),
      severity: diagnostic?.severity === "warn" ? "warn" : "error",
      message: String(diagnostic?.message || "Unknown diagnostic"),
      filePath: toRelativePath({ cwd, filePath: diagnostic?.filePath || "unknown" }),
      line: Number.isInteger(diagnostic?.line) ? diagnostic.line : undefined,
      column: Number.isInteger(diagnostic?.column) ? diagnostic.column : undefined,
      endLine: Number.isInteger(diagnostic?.endLine) ? diagnostic.endLine : undefined,
      endColumn: Number.isInteger(diagnostic?.endColumn) ? diagnostic.endColumn : undefined,
    }))
    .sort((left, right) => (
      left.code.localeCompare(right.code)
      || left.filePath.localeCompare(right.filePath)
      || (left.line || 0) - (right.line || 0)
      || (left.column || 0) - (right.column || 0)
      || left.message.localeCompare(right.message)
    ));
};

const toComponentRows = ({ compilerIr, cwd }) => {
  const byComponentContract = new Map();
  safeArray(compilerIr?.typedContract?.components).forEach((component) => {
    if (!component?.componentKey) {
      return;
    }
    byComponentContract.set(component.componentKey, component);
  });

  const byComponentStructural = new Map();
  safeArray(compilerIr?.structural?.components).forEach((component) => {
    if (!component?.componentKey) {
      return;
    }
    byComponentStructural.set(component.componentKey, component);
  });

  const componentKeys = [...new Set([
    ...byComponentContract.keys(),
    ...byComponentStructural.keys(),
  ])].sort((left, right) => left.localeCompare(right));

  return componentKeys.map((componentKey) => {
    const contract = byComponentContract.get(componentKey) || {};
    const structural = byComponentStructural.get(componentKey) || {};
    return {
      componentKey,
      componentName: contract.componentName || componentKey,
      files: safeArray(structural.files).map((entry) => ({
        kind: entry?.kind || "unknown",
        filePath: toRelativePath({ cwd, filePath: entry?.filePath || "unknown" }),
      })),
      contracts: {
        props: safeArray(contract?.props?.names),
        requiredProps: safeArray(contract?.props?.requiredNames),
        events: safeArray(contract?.events?.names),
        methods: safeArray(contract?.methods?.names),
        handlers: safeArray(contract?.handlers),
        actions: safeArray(contract?.actions),
        refs: safeArray(contract?.refs),
      },
    };
  });
};

export const createCompileArtifact = ({
  compilerIr = {},
  diagnostics = [],
  summary = {},
    semanticHash = "",
  cwd = process.cwd(),
  dirs = [],
} = {}) => {
  const artifact = {
    version: 1,
    metadata: {
      schema: "rtgl-compile-artifact-v1",
      generatedBy: "@rettangoli/check",
    },
    semanticHash,
    project: {
      root: ".",
      dirs: safeArray(dirs).map((entry) => toRelativePath({ cwd, filePath: String(entry) })),
    },
    summary: {
      total: Number(summary?.total) || 0,
      errors: Number(summary?.bySeverity?.error) || 0,
      warnings: Number(summary?.bySeverity?.warn) || 0,
    },
    components: toComponentRows({ compilerIr, cwd }),
    diagnostics: toDiagnosticRows({ diagnostics, cwd }),
  };

  return canonicalizeIrValue(artifact);
};
