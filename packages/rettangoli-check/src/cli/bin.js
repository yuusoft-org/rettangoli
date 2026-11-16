#!/usr/bin/env node
import check from "./check.js";
import { DIAGNOSTIC_CATALOG_VERSION, getDiagnosticCatalogEntry } from "../diagnostics/catalog.js";

const CHECK_USAGE = [
  "Usage: rtgl-check [options]",
  "",
  "Options:",
  "  --dir <path>        Component directory (repeatable)",
  "  --dirs <path>       Alias for --dir",
  "  --format <value>    Report format: text | json | sarif",
  "  --warn-as-error     Treat warnings as errors",
  "  --no-yahtml         Disable YAHTML attribute checks",
  "  --style             Enable optional naming and signature conventions",
  "  --watch             Re-run check when files change (polling)",
  "  --watch-interval-ms Poll interval in milliseconds (default: 800)",
  "  -h, --help          Show this help",
].join("\n");

const DEPRECATED_AUTOFIX_FLAGS = new Set(["--autofix", "--autofix-dry-run", "--autofix-patch", "--autofix-min-confidence"]);

class CliArgError extends Error {
  constructor(message, { usage = CHECK_USAGE } = {}) {
    super(message);
    this.name = "CliArgError";
    this.command = "check";
    this.usage = usage;
  }
}

const getRequiredValue = ({ args, index, flag, usage }) => {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new CliArgError(`Missing value for ${flag}.`, { usage });
  }
  return value;
};

const parseCheckArgs = (args = []) => {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true, usage: CHECK_USAGE, command: "check" };
  }

  const dirs = [];
  let format = "text";
  let warnAsError = false;
  let includeYahtml = true;
  let includeStyle;
  let watch = false;
  let watchIntervalMs = 800;
  const deprecatedFlags = new Set();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "check") {
      continue;
    }

    if (arg === "--dirs" || arg === "--dir") {
      const value = getRequiredValue({ args, index: i, flag: arg, usage: CHECK_USAGE });
      dirs.push(value);
      i += 1;
      continue;
    }

    if (arg === "--format") {
      const value = getRequiredValue({ args, index: i, flag: arg, usage: CHECK_USAGE });
      if (value !== "text" && value !== "json" && value !== "sarif") {
        throw new CliArgError(`Invalid value for --format: "${value}". Expected "text", "json", or "sarif".`, {
          usage: CHECK_USAGE,
        });
      }
      format = value;
      i += 1;
      continue;
    }

    if (arg === "--warn-as-error") {
      warnAsError = true;
      continue;
    }

    if (arg === "--no-yahtml") {
      includeYahtml = false;
      continue;
    }

    if (arg === "--expr") {
      deprecatedFlags.add(arg);
      continue;
    }

    if (arg === "--style") {
      includeStyle = true;
      continue;
    }

    if (DEPRECATED_AUTOFIX_FLAGS.has(arg)) {
      deprecatedFlags.add(arg);
      if (arg === "--autofix-min-confidence") {
        getRequiredValue({ args, index: i, flag: arg, usage: CHECK_USAGE });
        i += 1;
      }
      continue;
    }

    if (arg === "--watch") {
      watch = true;
      continue;
    }

    if (arg === "--watch-interval-ms") {
      const value = getRequiredValue({ args, index: i, flag: arg, usage: CHECK_USAGE });
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new CliArgError(`Invalid value for --watch-interval-ms: "${value}". Expected a positive integer.`, {
          usage: CHECK_USAGE,
        });
      }
      watchIntervalMs = parsed;
      i += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new CliArgError(`Unknown option: ${arg}`, { usage: CHECK_USAGE });
    }

    throw new CliArgError(`Unexpected positional argument: ${arg}`, { usage: CHECK_USAGE });
  }

  return {
    help: false,
    usage: CHECK_USAGE,
    command: "check",
    deprecatedFlags: [...deprecatedFlags],
    options: {
      cwd: process.cwd(),
      dirs,
      format,
      warnAsError,
      includeYahtml,
      includeStyle,
      watch,
      watchIntervalMs,
    },
  };
};

const formatCliRuntimeErrorReport = ({ message, warnAsError = false }) => {
  const catalogEntry = getDiagnosticCatalogEntry("RTGL-CLI-001");
  const diagnostic = {
    code: "RTGL-CLI-001",
    category: "cli",
    family: catalogEntry.family,
    title: catalogEntry.title,
    severity: "error",
    message,
    docsPath: catalogEntry.docsPath,
    namespaceValid: catalogEntry.namespaceValid,
    tags: catalogEntry.tags,
    filePath: "unknown",
  };

  return JSON.stringify({
    $schema: "docs/diagnostics-json-schema-v1.json",
    schemaVersion: 1,
    contractVersion: 1,
    reportFormat: "json",
    diagnosticCatalogVersion: DIAGNOSTIC_CATALOG_VERSION,
    ok: false,
    command: "check",
    componentCount: 0,
    registryTagCount: 0,
    summary: {
      total: 1,
      bySeverity: {
        error: 1,
        warn: 0,
      },
      byCode: [
        {
          code: diagnostic.code,
          count: 1,
        },
      ],
    },
    warnAsError,
    diagnosticCatalog: [catalogEntry],
    diagnostics: [diagnostic],
  }, null, 2);
};

const formatCliRuntimeErrorSarif = ({ message }) => {
  const catalogEntry = getDiagnosticCatalogEntry("RTGL-CLI-001");
  return JSON.stringify({
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "@rettangoli/check",
            rules: [
              {
                id: "RTGL-CLI-001",
                shortDescription: { text: catalogEntry.title },
                fullDescription: { text: catalogEntry.description },
                helpUri: catalogEntry.docsPath,
                defaultConfiguration: { level: "error" },
                properties: {
                  category: catalogEntry.family,
                  namespaceValid: catalogEntry.namespaceValid,
                  tags: catalogEntry.tags,
                },
              },
            ],
          },
        },
        results: [
          {
            ruleId: "RTGL-CLI-001",
            level: "error",
            message: { text: message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: "unknown" },
                },
              },
            ],
          },
        ],
      },
    ],
  }, null, 2);
};

const warnDeprecatedFlags = (flags = []) => {
  const autofixFlags = flags.filter((flag) => DEPRECATED_AUTOFIX_FLAGS.has(flag));
  if (autofixFlags.length > 0) {
    console.error(`[Check] Deprecated: autofix was removed. ${autofixFlags.join(", ")} ${autofixFlags.length > 1 ? "have" : "has"} no effect and will be rejected in a later release.`);
  }
  if (flags.includes("--expr")) {
    console.error("[Check] Deprecated: expression checks were removed. --expr has no effect and will be rejected in a later release.");
  }
};

const main = async () => {
  let parsed = null;

  try {
    parsed = parseCheckArgs(process.argv.slice(2));
    if (parsed.help) {
      console.log(parsed.usage);
      process.exitCode = 0;
      return;
    }

    warnDeprecatedFlags(parsed.deprecatedFlags);
    await check(parsed.options);
  } catch (err) {
    if (err instanceof CliArgError) {
      console.error(`[Check] ${err.message}`);
      console.error("");
      console.error(err.usage);
      process.exitCode = 1;
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    const format = parsed?.options?.format || "text";

    if (format === "json") {
      console.log(formatCliRuntimeErrorReport({
        message,
        warnAsError: Boolean(parsed?.options?.warnAsError),
      }));
      process.exitCode = 1;
      return;
    }

    if (format === "sarif") {
      console.log(formatCliRuntimeErrorSarif({ message }));
      process.exitCode = 1;
      return;
    }

    console.error(`[Check] ${message}`);
    process.exitCode = 1;
  }
};

await main();
