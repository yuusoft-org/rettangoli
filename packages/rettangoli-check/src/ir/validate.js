import { DIAGNOSTIC_SEVERITIES, IR_COMPATIBILITY_POLICY } from "./schema.js";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const pushIssue = ({ issues, code, path, message, severity = "error" }) => {
  issues.push({ code, path, message, severity });
};

const ensureArray = ({ value, path, issues, code }) => {
  if (!Array.isArray(value)) {
    pushIssue({ issues, code, path, message: `Expected array at '${path}'.` });
    return [];
  }
  return value;
};

export const validateCompilerIr = (ir = {}) => {
  const issues = [];

  if (!isObject(ir)) {
    pushIssue({
      issues,
      code: "RTGL-IR-VAL-001",
      path: "",
      message: "IR root must be an object.",
    });
    return { ok: false, errors: issues, warnings: [] };
  }

  if (!Number.isInteger(ir.version)) {
    pushIssue({
      issues,
      code: "RTGL-IR-VAL-002",
      path: "version",
      message: "IR version must be an integer.",
    });
  } else if (ir.version < IR_COMPATIBILITY_POLICY.minReadableVersion) {
    pushIssue({
      issues,
      code: "RTGL-IR-VAL-003",
      path: "version",
      message: `Unsupported IR version '${ir.version}'.`,
    });
  }

  const structural = isObject(ir.structural) ? ir.structural : {};
  const semantic = isObject(ir.semantic) ? ir.semantic : {};
  const typedContract = isObject(ir.typedContract) ? ir.typedContract : {};
  const diagnostics = isObject(ir.diagnostics) ? ir.diagnostics : {};

  const components = ensureArray({
    value: structural.components,
    path: "structural.components",
    issues,
    code: "RTGL-IR-VAL-010",
  });
  const symbolRows = ensureArray({
    value: semantic.symbols,
    path: "semantic.symbols",
    issues,
    code: "RTGL-IR-VAL-011",
  });
  const edgeRows = ensureArray({
    value: semantic.edges,
    path: "semantic.edges",
    issues,
    code: "RTGL-IR-VAL-012",
  });
  const refRows = ensureArray({
    value: semantic.refs,
    path: "semantic.refs",
    issues,
    code: "RTGL-IR-VAL-015",
  });
  const typedComponents = ensureArray({
    value: typedContract.components,
    path: "typedContract.components",
    issues,
    code: "RTGL-IR-VAL-013",
  });
  const diagnosticRows = ensureArray({
    value: diagnostics.items,
    path: "diagnostics.items",
    issues,
    code: "RTGL-IR-VAL-014",
  });

  const componentKeys = new Set();
  components.forEach((component, index) => {
    const path = `structural.components.${index}`;
    const componentKey = component?.componentKey;
    if (typeof componentKey !== "string" || componentKey.trim().length === 0) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-001",
        path,
        message: "Component row must include non-empty componentKey.",
      });
      return;
    }
    if (componentKeys.has(componentKey)) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-002",
        path,
        message: `Duplicate componentKey '${componentKey}'.`,
      });
      return;
    }
    componentKeys.add(componentKey);
  });

  const symbolIds = new Set();
  symbolRows.forEach((symbol, index) => {
    const path = `semantic.symbols.${index}`;
    const symbolId = symbol?.id;
    if (typeof symbolId !== "string" || symbolId.trim().length === 0) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-003",
        path,
        message: "Symbol row must include non-empty id.",
      });
      return;
    }
    if (symbolIds.has(symbolId)) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-004",
        path,
        message: `Duplicate symbol id '${symbolId}'.`,
      });
      return;
    }
    symbolIds.add(symbolId);
  });

  const referenceIds = new Set();
  refRows.forEach((ref, index) => {
    const refId = ref?.id;
    if (typeof refId !== "string" || refId.trim().length === 0) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-010",
        path: `semantic.refs.${index}`,
        message: "Reference row must include non-empty id.",
      });
      return;
    }
    if (referenceIds.has(refId)) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-011",
        path: `semantic.refs.${index}`,
        message: `Duplicate ref id '${refId}'.`,
      });
      return;
    }
    referenceIds.add(refId);
  });

  const edgeTargetIds = new Set([...symbolIds, ...referenceIds]);

  edgeRows.forEach((edge, index) => {
    const path = `semantic.edges.${index}`;
    const from = edge?.from;
    const to = edge?.to;
    if (typeof from === "string" && from.length > 0 && !edgeTargetIds.has(from)) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-005",
        path,
        message: `Edge 'from' references unknown node '${from}'.`,
      });
    }
    if (typeof to === "string" && to.length > 0 && !edgeTargetIds.has(to)) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-006",
        path,
        message: `Edge 'to' references unknown node '${to}'.`,
      });
    }
  });

  typedComponents.forEach((component, index) => {
    const path = `typedContract.components.${index}`;
    const componentKey = component?.componentKey;
    if (typeof componentKey !== "string" || componentKey.length === 0) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-007",
        path,
        message: "Typed contract component must include componentKey.",
      });
      return;
    }
    if (!componentKeys.has(componentKey)) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-008",
        path,
        message: `Typed contract references unknown componentKey '${componentKey}'.`,
      });
    }
  });

  diagnosticRows.forEach((diagnostic, index) => {
    const path = `diagnostics.items.${index}`;
    const severity = diagnostic?.severity;
    if (!DIAGNOSTIC_SEVERITIES.has(severity)) {
      pushIssue({
        issues,
        code: "RTGL-IR-INV-009",
        path,
        message: `Diagnostic severity '${severity}' is invalid.`,
      });
    }
  });

  const errors = issues.filter((issue) => issue.severity !== "warn");
  const warnings = issues.filter((issue) => issue.severity === "warn");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
};
