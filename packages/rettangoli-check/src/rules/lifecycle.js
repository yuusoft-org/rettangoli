import { parseSync } from "oxc-parser";
import { getModelFilePath } from "./shared.js";

const LIFECYCLE_NAMES = new Set([
  "handleBeforeMount",
  "handleAfterMount",
  "handleOnUpdate",
]);

const createLineOffsets = (source = "") => {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      offsets.push(index + 1);
    }
  }
  return offsets;
};

const offsetToLine = ({ lineOffsets = [], offset = 0 }) => {
  let low = 0;
  let high = lineOffsets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = lineOffsets[mid];
    const next = lineOffsets[mid + 1] ?? Number.POSITIVE_INFINITY;
    if (offset >= start && offset < next) {
      return mid + 1;
    }
    if (offset < start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return undefined;
};

const extractParamName = (param = {}) => {
  if (!param || typeof param !== "object") {
    return null;
  }
  if (param.type === "Identifier") {
    return param.name || null;
  }
  if (param.type === "AssignmentPattern" && param.left?.type === "Identifier") {
    return param.left.name || null;
  }
  return null;
};

const extractExportedFunctions = ({ sourceText = "", filePath = "unknown.js" }) => {
  const result = new Map();
  let parsed = null;
  try {
    parsed = parseSync(filePath, sourceText, { sourceType: "unambiguous" });
  } catch {
    return result;
  }
  if (!parsed?.program?.body || !Array.isArray(parsed.program.body)) {
    return result;
  }
  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
    return result;
  }

  const lineOffsets = createLineOffsets(sourceText);
  const register = ({ name, node }) => {
    if (!name || !node) {
      return;
    }
    const params = Array.isArray(node.params) ? node.params : [];
    result.set(name, {
      name,
      async: Boolean(node.async),
      paramCount: params.length,
      firstParamName: extractParamName(params[0]),
      secondParamName: extractParamName(params[1]),
      line: offsetToLine({ lineOffsets, offset: Number(node.start) || 0 }),
    });
  };

  parsed.program.body.forEach((statement) => {
    if (!statement || statement.type !== "ExportNamedDeclaration") {
      return;
    }

    const declaration = statement.declaration;
    if (!declaration) {
      return;
    }

    if (declaration.type === "FunctionDeclaration" && declaration.id?.name) {
      register({ name: declaration.id.name, node: declaration });
      return;
    }

    if (declaration.type === "VariableDeclaration" && Array.isArray(declaration.declarations)) {
      declaration.declarations.forEach((declarator) => {
        if (!declarator?.id?.name) {
          return;
        }
        const init = declarator.init;
        if (!init) {
          return;
        }
        if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") {
          register({ name: declarator.id.name, node: init });
        }
      });
    }
  });

  return result;
};

export const runLifecycleRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const handlersPath = getModelFilePath({ model, fileType: "handlers" });
    const handlersExports = model?.handlers?.exports instanceof Set
      ? model.handlers.exports
      : new Set();
    const handlersSource = String(model?.handlers?.sourceText || "");

    const exportedFunctions = extractExportedFunctions({
      sourceText: handlersSource,
      filePath: handlersPath,
    });

    if (handlersExports.has("handleBeforeMount")) {
      const meta = exportedFunctions.get("handleBeforeMount");
      if (meta?.async) {
        diagnostics.push({
          code: "RTGL-CHECK-LIFECYCLE-001",
          severity: "error",
          filePath: handlersPath,
          line: meta.line,
          message: `${model.componentKey}: lifecycle handler 'handleBeforeMount' must be synchronous.`,
        });
      }
    }

    LIFECYCLE_NAMES.forEach((name) => {
      if (!handlersExports.has(name)) {
        return;
      }
      const meta = exportedFunctions.get(name);
      if (!meta) {
        return;
      }

      if (meta.firstParamName !== "deps") {
        diagnostics.push({
          code: "RTGL-CHECK-LIFECYCLE-002",
          severity: "error",
          filePath: handlersPath,
          line: meta.line,
          message: `${model.componentKey}: lifecycle handler '${name}' must use 'deps' as first parameter.`,
        });
      }
    });

    if (handlersExports.has("handleOnUpdate")) {
      const meta = exportedFunctions.get("handleOnUpdate");
      if (meta && meta.paramCount < 2) {
        diagnostics.push({
          code: "RTGL-CHECK-LIFECYCLE-003",
          severity: "error",
          filePath: handlersPath,
          line: meta.line,
          message: `${model.componentKey}: lifecycle handler 'handleOnUpdate' should accept a second 'payload' parameter.`,
        });
      }
    }
  });

  return diagnostics;
};
