export const IR_VERSION = 1;

export const IR_COMPATIBILITY_POLICY = Object.freeze({
  currentVersion: IR_VERSION,
  minReadableVersion: 1,
  minWritableVersion: 1,
  breakingChangePolicy: "major-version-only",
});

export const DIAGNOSTIC_SEVERITIES = new Set(["error", "warn", "info"]);

const cloneArray = (value) => (Array.isArray(value) ? [...value] : []);

export const createEmptyCompilerIr = () => ({
  version: IR_VERSION,
  structural: {
    components: [],
    dependencies: [],
  },
  semantic: {
    symbols: [],
    scopes: [],
    edges: [],
    refs: [],
  },
  typedContract: {
    components: [],
  },
  diagnostics: {
    items: [],
  },
  metadata: {
    generatedBy: "@rettangoli/check",
    generatedAt: new Date(0).toISOString(),
  },
});

export const normalizeDiagnosticSeverity = (severity = "error") => {
  if (DIAGNOSTIC_SEVERITIES.has(severity)) {
    return severity;
  }
  return "error";
};

export const createCompilerIr = ({
  version = IR_VERSION,
  structural = {},
  semantic = {},
  typedContract = {},
  diagnostics = {},
  metadata = {},
} = {}) => {
  const base = createEmptyCompilerIr();

  return {
    version,
    structural: {
      components: cloneArray(structural.components),
      dependencies: cloneArray(structural.dependencies),
    },
    semantic: {
      symbols: cloneArray(semantic.symbols),
      scopes: cloneArray(semantic.scopes),
      edges: cloneArray(semantic.edges),
      refs: cloneArray(semantic.refs),
    },
    typedContract: {
      components: cloneArray(typedContract.components),
    },
    diagnostics: {
      items: cloneArray(diagnostics.items).map((item) => ({
        ...item,
        severity: normalizeDiagnosticSeverity(item?.severity),
      })),
    },
    metadata: {
      ...base.metadata,
      ...metadata,
    },
  };
};
