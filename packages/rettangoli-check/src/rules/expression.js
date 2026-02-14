import { buildComponentScopeGraph, resolveSchemaPathType } from "../core/scopeGraph.js";
import { collectSelectViewDataRoots } from "../core/semantic.js";
import { getModelFilePath } from "./shared.js";

const normalizeSchemaType = (schemaNode) => {
  if (!schemaNode || typeof schemaNode !== "object" || Array.isArray(schemaNode)) {
    return null;
  }
  if (typeof schemaNode.type === "string" && schemaNode.type) {
    return schemaNode.type;
  }
  return null;
};

const isUnknownExpressionRoot = ({ root = "", globalSymbols = new Set(), localSymbols = new Set() }) => {
  if (!root) {
    return false;
  }
  if (globalSymbols.has(root)) {
    return false;
  }
  if (localSymbols.has(root)) {
    return false;
  }
  if (/^[-+]?(?:\d+\.?\d*|\d*\.?\d+)$/u.test(root)) {
    return false;
  }
  return true;
};

export const runExpressionRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const viewPath = getModelFilePath({ model, fileType: "view" });
    const scopeGraph = model?.semanticGraph || buildComponentScopeGraph(model);
    const viewDataRoots = collectSelectViewDataRoots(
      model?.store?.sourceText || "",
      model?.store?.filePath || "unknown.store.js",
    );
    const globalSymbols = scopeGraph?.globalSymbols instanceof Set
      ? scopeGraph.globalSymbols
      : new Set();
    const references = Array.isArray(scopeGraph?.references) ? scopeGraph.references : [];

    references.forEach((reference) => {
      const localSymbols = reference?.localSymbols instanceof Set
        ? reference.localSymbols
        : new Set(reference?.localSymbols || []);

      const unknownRoots = (reference?.roots || []).filter((root) => isUnknownExpressionRoot({
        root,
        globalSymbols,
        localSymbols,
      }));
      if (unknownRoots.length > 0) {
        diagnostics.push({
          code: "RTGL-CHECK-EXPR-001",
          severity: "error",
          filePath: viewPath,
          line: reference.line,
          column: reference.column,
          endLine: reference.endLine,
          endColumn: reference.endColumn,
          message: `${model.componentKey}: unresolved expression root(s) [${unknownRoots.join(", ")}] in '${reference.expression}'.`,
        });
      }

      const schemaPathType = resolveSchemaPathType({
        model,
        expression: reference?.expression || "",
      });
      if (!schemaPathType) {
        return;
      }
      if (viewDataRoots.has(schemaPathType.root)) {
        return;
      }

      if (!schemaPathType.resolved && schemaPathType.missingSegment) {
        diagnostics.push({
          code: "RTGL-CHECK-EXPR-002",
          severity: "error",
          filePath: viewPath,
          line: reference.line,
          column: reference.column,
          endLine: reference.endLine,
          endColumn: reference.endColumn,
          message: `${model.componentKey}: unknown schema path segment '${schemaPathType.missingSegment}' in expression '${reference.expression}'.`,
        });
        return;
      }

      if (reference?.context === "attr-boolean") {
        const resolvedType = normalizeSchemaType(schemaPathType.resolved);
        if (resolvedType && resolvedType !== "boolean") {
          diagnostics.push({
            code: "RTGL-CHECK-EXPR-003",
            severity: "error",
            filePath: viewPath,
            line: reference.line,
            column: reference.column,
            endLine: reference.endLine,
            endColumn: reference.endColumn,
            message: `${model.componentKey}: boolean binding expects a boolean expression but '${reference.expression}' resolves to '${resolvedType}'.`,
          });
        }
      }
    });
  });

  return diagnostics;
};
