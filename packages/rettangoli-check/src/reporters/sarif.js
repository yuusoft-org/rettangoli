import { createHash } from "node:crypto";
import path from "node:path";
import {
  DIAGNOSTIC_CATALOG_VERSION,
  getDiagnosticCatalogEntry,
} from "../diagnostics/catalog.js";

const toPosixPath = (value = "") => String(value).replaceAll(path.sep, "/");

const mapLevel = (severity = "error") => (severity === "warn" ? "warning" : "error");

const compareDiagnostics = (left = {}, right = {}) => {
  const leftLine = Number.isInteger(left.line) ? left.line : 0;
  const rightLine = Number.isInteger(right.line) ? right.line : 0;
  const leftColumn = Number.isInteger(left.column) ? left.column : 0;
  const rightColumn = Number.isInteger(right.column) ? right.column : 0;

  return (
    String(left.code || "").localeCompare(String(right.code || ""))
    || mapLevel(left.severity).localeCompare(mapLevel(right.severity))
    || String(left.filePath || "").localeCompare(String(right.filePath || ""))
    || leftLine - rightLine
    || leftColumn - rightColumn
    || String(left.message || "").localeCompare(String(right.message || ""))
  );
};

const normalizeDiagnostics = (diagnostics = []) => {
  return [...(Array.isArray(diagnostics) ? diagnostics : [])].sort(compareDiagnostics);
};

const toRuleMap = (diagnostics = []) => {
  const codes = [...new Set(
    normalizeDiagnostics(diagnostics)
      .map((diagnostic) => String(diagnostic?.code || "RTGL-CHECK-UNKNOWN")),
  )];

  return codes.map((code) => {
    const catalog = getDiagnosticCatalogEntry(code);
    return {
      id: code,
      shortDescription: {
        text: catalog.title,
      },
      fullDescription: {
        text: catalog.description,
      },
      helpUri: catalog.docsPath,
      defaultConfiguration: {
        level: mapLevel(catalog.defaultSeverity),
      },
      properties: {
        category: catalog.family,
        namespaceValid: catalog.namespaceValid,
        tags: Array.isArray(catalog.tags) ? catalog.tags : [],
      },
    };
  });
};

const toSarifPhysicalLocation = ({ cwd, location = {} }) => {
  const relPath = location.filePath && location.filePath !== "unknown"
    ? toPosixPath(path.relative(cwd, location.filePath))
    : "unknown";

  const region = {};
  if (Number.isInteger(location.line) && location.line > 0) {
    region.startLine = location.line;
  }
  if (Number.isInteger(location.column) && location.column > 0) {
    region.startColumn = location.column;
  }
  if (Number.isInteger(location.endLine) && location.endLine > 0) {
    region.endLine = location.endLine;
  }
  if (Number.isInteger(location.endColumn) && location.endColumn > 0) {
    region.endColumn = location.endColumn;
  }

  return {
    artifactLocation: {
      uri: relPath || "unknown",
    },
    ...(Object.keys(region).length > 0 ? { region } : {}),
  };
};

const toRelatedLocations = ({ cwd, diagnostic = {} }) => {
  const related = Array.isArray(diagnostic.related) ? diagnostic.related : [];
  return related
    .filter((location) => location && typeof location === "object")
    .map((location, index) => ({
      id: index + 1,
      message: {
        text: location.message || "related location",
      },
      physicalLocation: toSarifPhysicalLocation({ cwd, location }),
    }));
};

const toCodeFlows = (diagnostic = {}) => {
  const trace = Array.isArray(diagnostic.trace)
    ? diagnostic.trace
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
    : [];
  if (trace.length === 0) {
    return undefined;
  }

  return [
    {
      threadFlows: [
        {
          locations: trace.map((entry) => ({
            location: {
              message: {
                text: entry,
              },
            },
          })),
        },
      ],
    },
  ];
};

const toPartialFingerprints = (diagnostic = {}) => {
  const source = [
    String(diagnostic.code || "RTGL-CHECK-UNKNOWN"),
    mapLevel(diagnostic.severity),
    String(diagnostic.filePath || "unknown"),
    Number.isInteger(diagnostic.line) ? diagnostic.line : 0,
    Number.isInteger(diagnostic.column) ? diagnostic.column : 0,
    String(diagnostic.message || ""),
  ].join("|");

  return {
    primaryLocationLineHash: createHash("sha1").update(source).digest("hex"),
  };
};

const toSarifResult = ({ cwd, diagnostic = {} }) => {
  const code = diagnostic.code || "RTGL-CHECK-UNKNOWN";
  const relatedLocations = toRelatedLocations({ cwd, diagnostic });
  const codeFlows = toCodeFlows(diagnostic);
  const catalog = getDiagnosticCatalogEntry(code);

  return {
    ruleId: code,
    level: mapLevel(diagnostic.severity),
    message: {
      text: diagnostic.message || code,
    },
    locations: [
      {
        physicalLocation: toSarifPhysicalLocation({
          cwd,
          location: diagnostic,
        }),
      },
    ],
    partialFingerprints: toPartialFingerprints(diagnostic),
    ...(relatedLocations.length > 0 ? { relatedLocations } : {}),
    ...(codeFlows ? { codeFlows } : {}),
    properties: {
      category: catalog.family,
      docsPath: catalog.docsPath,
      ...(diagnostic.fix ? {
        autofix: {
          kind: diagnostic.fix.kind,
          safe: diagnostic.fix.safe !== false,
          confidence: diagnostic.fix.confidence,
          description: diagnostic.fix.description,
        },
      } : {}),
    },
  };
};

export const formatSarifReport = ({ result }) => {
  const diagnostics = normalizeDiagnostics(result.diagnostics);
  const rules = toRuleMap(diagnostics);
  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "@rettangoli/check",
            informationUri: "https://github.com/yuusoft-org/rettangoli",
            rules,
          },
        },
        automationDetails: {
          id: "rtgl-check/default",
        },
        results: diagnostics.map((diagnostic) => toSarifResult({
          cwd: result.cwd,
          diagnostic,
        })),
        properties: {
          componentCount: result.componentCount,
          registryTagCount: result.registryTagCount,
          diagnosticCatalogVersion: DIAGNOSTIC_CATALOG_VERSION,
        },
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
};
