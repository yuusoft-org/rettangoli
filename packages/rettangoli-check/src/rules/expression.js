import { buildComponentScopeGraph, resolveExpressionPathType } from "../core/scopeGraph.js";
import { JEMPL_BINARY_OP, JEMPL_NODE, JEMPL_UNARY_OP } from "../core/parsers.js";
import { collectSelectViewDataRoots } from "../core/semantic.js";
import { areTypesCompatible, inferSchemaNodePrimitiveType } from "../types/lattice.js";
import { getModelFilePath } from "./shared.js";

const JEMPL_BINARY_OPERATOR_SYMBOL_BY_OP = new Map([
  [JEMPL_BINARY_OP.EQ, "=="],
  [JEMPL_BINARY_OP.NEQ, "!="],
  [JEMPL_BINARY_OP.GT, ">"],
  [JEMPL_BINARY_OP.LT, "<"],
  [JEMPL_BINARY_OP.GTE, ">="],
  [JEMPL_BINARY_OP.LTE, "<="],
  [JEMPL_BINARY_OP.AND, "&&"],
  [JEMPL_BINARY_OP.OR, "||"],
  [JEMPL_BINARY_OP.IN, "in"],
  [JEMPL_BINARY_OP.ADD, "+"],
  [JEMPL_BINARY_OP.SUBTRACT, "-"],
]);

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

const isEqualityCompatibleTypePair = ({ leftType, rightType }) => {
  if (!leftType || !rightType) {
    return true;
  }

  if (leftType === rightType) {
    return true;
  }

  return leftType === "null" || rightType === "null";
};

const inferExpressionAstType = ({
  model,
  node,
  localSchemaTypes,
  viewDataRoots,
  issues,
}) => {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (node.type === JEMPL_NODE.LITERAL) {
    if (typeof node.value === "boolean") return "boolean";
    if (typeof node.value === "number") return "number";
    if (typeof node.value === "string") return "string";
    if (node.value === null) return "null";
    return null;
  }

  if (node.type === JEMPL_NODE.PATH && typeof node.path === "string") {
    const pathType = resolveExpressionPathType({
      model,
      expression: node.path,
      localSchemaTypes,
    });
    if (!pathType || !pathType.resolved) {
      return null;
    }
    if (pathType.rootKind === "schema" && viewDataRoots.has(pathType.root)) {
      return null;
    }
    return inferSchemaNodePrimitiveType(pathType.resolved);
  }

  if (node.type === JEMPL_NODE.UNARY) {
    const operandType = inferExpressionAstType({
      model,
      node: node.operand,
      localSchemaTypes,
      viewDataRoots,
      issues,
    });

    if (node.op === JEMPL_UNARY_OP.NOT) {
      if (operandType && operandType !== "boolean") {
        issues.push(`operator '!' expects a boolean operand but resolved '${operandType}'.`);
      }
      return "boolean";
    }
    return null;
  }

  if (node.type === JEMPL_NODE.BINARY) {
    const leftType = inferExpressionAstType({
      model,
      node: node.left,
      localSchemaTypes,
      viewDataRoots,
      issues,
    });
    const rightType = inferExpressionAstType({
      model,
      node: node.right,
      localSchemaTypes,
      viewDataRoots,
      issues,
    });
    const operator = JEMPL_BINARY_OPERATOR_SYMBOL_BY_OP.get(node.op) || "unknown";

    if (node.op === JEMPL_BINARY_OP.AND || node.op === JEMPL_BINARY_OP.OR) {
      if (leftType && rightType && (leftType !== "boolean" || rightType !== "boolean")) {
        issues.push(`operator '${operator}' expects boolean operands but resolved '${leftType}' and '${rightType}'.`);
      }
      return "boolean";
    }

    if (
      node.op === JEMPL_BINARY_OP.GT
      || node.op === JEMPL_BINARY_OP.GTE
      || node.op === JEMPL_BINARY_OP.LT
      || node.op === JEMPL_BINARY_OP.LTE
    ) {
      const comparable = new Set(["number", "string"]);
      if (leftType && rightType) {
        if (!comparable.has(leftType) || !comparable.has(rightType) || leftType !== rightType) {
          issues.push(`operator '${operator}' expects both operands to be 'number' or both 'string', but resolved '${leftType}' and '${rightType}'.`);
        }
      }
      return "boolean";
    }

    if (node.op === JEMPL_BINARY_OP.IN) {
      if (leftType && rightType && !["array", "string", "object"].includes(rightType)) {
        issues.push(`operator 'in' expects right operand type 'array', 'string', or 'object', but resolved '${rightType}'.`);
      }
      return "boolean";
    }

    if (node.op === JEMPL_BINARY_OP.ADD) {
      if (leftType && rightType) {
        if (leftType === "number" && rightType === "number") {
          return "number";
        }
        if (leftType === "string" && rightType === "string") {
          return "string";
        }
        issues.push(`operator '+' expects both operands to be 'number' or both 'string', but resolved '${leftType}' and '${rightType}'.`);
      }
      return null;
    }

    if (node.op === JEMPL_BINARY_OP.SUBTRACT) {
      if (leftType && rightType && (leftType !== "number" || rightType !== "number")) {
        issues.push(`operator '-' expects number operands but resolved '${leftType}' and '${rightType}'.`);
      }
      return leftType && rightType ? "number" : null;
    }

    if (
      node.op === JEMPL_BINARY_OP.EQ
      || node.op === JEMPL_BINARY_OP.NEQ
    ) {
      if (!isEqualityCompatibleTypePair({ leftType, rightType })) {
        issues.push(`operator '${operator}' expects compatible operand types, but resolved '${leftType}' and '${rightType}'.`);
      }
      return "boolean";
    }
  }

  return null;
};

const collectPathNodesFromExpressionAst = (node, rows = []) => {
  if (Array.isArray(node)) {
    node.forEach((entry) => collectPathNodesFromExpressionAst(entry, rows));
    return rows;
  }

  if (!node || typeof node !== "object") {
    return rows;
  }

  if (node.type === JEMPL_NODE.PATH && typeof node.path === "string") {
    rows.push({
      path: node.path,
      range: node.range || {},
    });
  }

  Object.values(node).forEach((value) => {
    collectPathNodesFromExpressionAst(value, rows);
  });

  return rows;
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

      const localSchemaTypes = reference?.localSchemaTypes instanceof Map
        ? reference.localSchemaTypes
        : new Map(reference?.localSchemaTypes || []);
      const schemaPathType = resolveExpressionPathType({
        model,
        expression: reference?.expression || "",
        localSchemaTypes,
      });
      if (reference?.context === "condition" && reference?.expressionAst) {
        const pathNodes = collectPathNodesFromExpressionAst(reference.expressionAst);
        pathNodes.forEach((pathNode) => {
          const pathType = resolveExpressionPathType({
            model,
            expression: pathNode.path,
            localSchemaTypes,
          });
          if (!pathType || pathType.resolved || !pathType.missingSegment) {
            return;
          }

          diagnostics.push({
            code: "RTGL-CHECK-EXPR-005",
            severity: "error",
            filePath: viewPath,
            line: pathNode?.range?.line || reference.line,
            column: pathNode?.range?.column || reference.column,
            endLine: pathNode?.range?.endLine || reference.endLine,
            endColumn: pathNode?.range?.endColumn || reference.endColumn,
            message: `${model.componentKey}: unknown schema path segment '${pathType.missingSegment}' in condition path '${pathNode.path}'.`,
          });
        });
      }

      if (!schemaPathType) {
        if (reference?.context === "condition" && reference?.expressionAst) {
          const issues = [];
          inferExpressionAstType({
            model,
            node: reference.expressionAst,
            localSchemaTypes,
            viewDataRoots,
            issues,
          });
          issues.forEach((issue) => {
            diagnostics.push({
              code: "RTGL-CHECK-EXPR-004",
              severity: "error",
              filePath: viewPath,
              line: reference.line,
              column: reference.column,
              endLine: reference.endLine,
              endColumn: reference.endColumn,
              message: `${model.componentKey}: invalid condition expression '${reference.expression}': ${issue}`,
            });
          });
        }
        return;
      }
      if (schemaPathType.rootKind === "schema" && viewDataRoots.has(schemaPathType.root)) {
        return;
      }

      if (reference?.context !== "condition" && !schemaPathType.resolved && schemaPathType.missingSegment) {
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
        const resolvedType = inferSchemaNodePrimitiveType(schemaPathType.resolved);
        if (!areTypesCompatible({ expected: "boolean", actual: resolvedType })) {
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
