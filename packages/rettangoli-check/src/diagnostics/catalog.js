const CODE_NAMESPACE_REGEX = /^RTGL-(CHECK|CONTRACT|CLI|IR)-[A-Z0-9-]+-\d{3}$/;

const DEFAULT_FAMILY_CONFIG = [
  { prefix: "RTGL-CHECK-YAHTML-", family: "template", severity: "error", title: "YAHTML template diagnostic" },
  { prefix: "RTGL-CHECK-JEMPL-", family: "template", severity: "error", title: "Jempl template diagnostic" },
  { prefix: "RTGL-CHECK-EXPR-", family: "expression", severity: "error", title: "Expression diagnostic" },
  { prefix: "RTGL-CHECK-SCHEMA-", family: "schema", severity: "error", title: "Schema diagnostic" },
  { prefix: "RTGL-CHECK-SYMBOL-", family: "symbols", severity: "error", title: "Symbol resolution diagnostic" },
  { prefix: "RTGL-CHECK-LISTENER-", family: "listeners", severity: "error", title: "Listener contract diagnostic" },
  { prefix: "RTGL-CHECK-REF-", family: "refs", severity: "error", title: "Ref contract diagnostic" },
  { prefix: "RTGL-CHECK-HANDLER-", family: "handlers", severity: "error", title: "Handler contract diagnostic" },
  { prefix: "RTGL-CHECK-LIFECYCLE-", family: "lifecycle", severity: "error", title: "Lifecycle contract diagnostic" },
  { prefix: "RTGL-CHECK-COMPAT-", family: "compatibility", severity: "error", title: "Compatibility diagnostic" },
  { prefix: "RTGL-CHECK-METHOD-", family: "methods", severity: "error", title: "Method contract diagnostic" },
  { prefix: "RTGL-CHECK-CONTRACT-", family: "contracts", severity: "error", title: "Contract diagnostic" },
  { prefix: "RTGL-CONTRACT-", family: "contracts", severity: "error", title: "Legacy contract diagnostic" },
  { prefix: "RTGL-CHECK-SEM-", family: "semantic", severity: "warn", title: "Semantic engine diagnostic" },
  { prefix: "RTGL-CHECK-SEM-INV-", family: "semantic-invariants", severity: "error", title: "Semantic invariant diagnostic" },
  { prefix: "RTGL-CHECK-CONSTANTS-", family: "constants", severity: "error", title: "Constants diagnostic" },
  { prefix: "RTGL-CHECK-COMPONENT-", family: "component-identity", severity: "error", title: "Component identity diagnostic" },
  { prefix: "RTGL-CHECK-READ-", family: "io", severity: "error", title: "Read/input diagnostic" },
  { prefix: "RTGL-CHECK-PARSE-", family: "parse", severity: "error", title: "Parse diagnostic" },
  { prefix: "RTGL-IR-VAL-", family: "ir-validation", severity: "error", title: "IR validation diagnostic" },
  { prefix: "RTGL-IR-INV-", family: "ir-invariants", severity: "error", title: "IR invariant diagnostic" },
  { prefix: "RTGL-CLI-", family: "cli", severity: "error", title: "CLI runtime diagnostic" },
];

const CATALOG_VERSION = 1;

const CODE_OVERRIDES = {
  "RTGL-CONTRACT-003": {
    title: "Legacy dot-prop binding",
    description: "Legacy '.prop=' template bindings are unsupported and should be converted to ':prop='.",
    tags: ["autofix-safe", "template"],
  },
  "RTGL-CHECK-YAHTML-002": {
    title: "Legacy YAHTML prop binding",
    description: "Legacy '.prop' YAHTML binding is unsupported and should be converted to ':prop'.",
    tags: ["autofix-safe", "template"],
  },
  "RTGL-CLI-001": {
    title: "CLI runtime failure",
    description: "CLI encountered invalid input or runtime execution failure.",
    tags: ["cli"],
  },
};

const findFamilyConfig = (code = "") => {
  return DEFAULT_FAMILY_CONFIG.find((entry) => code.startsWith(entry.prefix)) || {
    family: "general",
    severity: "error",
    title: "General diagnostic",
  };
};

const codeToDocsAnchor = (code = "") => {
  return `docs/diagnostics-reference.md#${code.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
};

export const isValidDiagnosticCodeNamespace = (code = "") => {
  return CODE_NAMESPACE_REGEX.test(String(code));
};

export const getDiagnosticCatalogEntry = (code = "") => {
  const normalizedCode = String(code || "RTGL-CHECK-UNKNOWN");
  const familyConfig = findFamilyConfig(normalizedCode);
  const override = CODE_OVERRIDES[normalizedCode] || {};

  return {
    version: CATALOG_VERSION,
    code: normalizedCode,
    family: override.family || familyConfig.family,
    title: override.title || familyConfig.title,
    description: override.description || `${familyConfig.title}.`,
    defaultSeverity: override.defaultSeverity || familyConfig.severity,
    namespaceValid: isValidDiagnosticCodeNamespace(normalizedCode),
    docsPath: override.docsPath || codeToDocsAnchor(normalizedCode),
    tags: Array.isArray(override.tags) ? [...override.tags] : [familyConfig.family],
  };
};

export const buildDiagnosticCatalog = (codes = []) => {
  const unique = [...new Set((Array.isArray(codes) ? codes : []).map((code) => String(code || "")).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

  return unique.map((code) => getDiagnosticCatalogEntry(code));
};

export const DIAGNOSTIC_CATALOG_VERSION = CATALOG_VERSION;
