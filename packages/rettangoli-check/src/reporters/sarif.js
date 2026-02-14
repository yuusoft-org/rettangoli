import path from "node:path";

const mapLevel = (severity = "error") => {
  return severity === "warn" ? "warning" : "error";
};

const toRuleMap = (diagnostics = []) => {
  const ruleMap = new Map();
  diagnostics.forEach((diagnostic) => {
    const code = diagnostic.code || "RTGL-CHECK-UNKNOWN";
    if (ruleMap.has(code)) {
      return;
    }
    ruleMap.set(code, {
      id: code,
      shortDescription: {
        text: code,
      },
      fullDescription: {
        text: code,
      },
      defaultConfiguration: {
        level: mapLevel(diagnostic.severity),
      },
      properties: {
        tags: [diagnostic.severity === "warn" ? "warning" : "error"],
      },
    });
  });
  return [...ruleMap.values()];
};

const toSarifResult = ({ cwd, diagnostic = {} }) => {
  const code = diagnostic.code || "RTGL-CHECK-UNKNOWN";
  const relPath = diagnostic.filePath && diagnostic.filePath !== "unknown"
    ? path.relative(cwd, diagnostic.filePath)
    : "unknown";

  const region = {};
  if (Number.isInteger(diagnostic.line)) {
    region.startLine = diagnostic.line;
  }
  if (Number.isInteger(diagnostic.column)) {
    region.startColumn = diagnostic.column;
  }
  if (Number.isInteger(diagnostic.endLine)) {
    region.endLine = diagnostic.endLine;
  }
  if (Number.isInteger(diagnostic.endColumn)) {
    region.endColumn = diagnostic.endColumn;
  }

  return {
    ruleId: code,
    level: mapLevel(diagnostic.severity),
    message: {
      text: diagnostic.message || code,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: relPath,
          },
          ...(Object.keys(region).length > 0 ? { region } : {}),
        },
      },
    ],
  };
};

export const formatSarifReport = ({ result }) => {
  const rules = toRuleMap(result.diagnostics);
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
        results: result.diagnostics.map((diagnostic) => toSarifResult({
          cwd: result.cwd,
          diagnostic,
        })),
        properties: {
          componentCount: result.componentCount,
          registryTagCount: result.registryTagCount,
        },
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
};
