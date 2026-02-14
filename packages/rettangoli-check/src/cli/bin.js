#!/usr/bin/env node
import check from "./check.js";

const USAGE = [
  "Usage: rtgl-check [options]",
  "",
  "Options:",
  "  --dir <path>        Component directory (repeatable)",
  "  --dirs <path>       Alias for --dir",
  "  --format <value>    Report format: text | json | sarif",
  "  --warn-as-error     Treat warnings as errors",
  "  --no-yahtml         Disable YAHTML attribute checks",
  "  --expr              Enable template expression root checks",
  "  --watch             Re-run check when files change (polling)",
  "  --watch-interval-ms Poll interval in milliseconds (default: 800)",
  "  -h, --help          Show this help",
].join("\n");

class CliArgError extends Error {
  constructor(message) {
    super(message);
    this.name = "CliArgError";
  }
}

const getRequiredValue = ({ args, index, flag }) => {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new CliArgError(`Missing value for ${flag}.`);
  }
  return value;
};

const parseArgs = (args = []) => {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }

  const dirs = [];
  let format = "text";
  let warnAsError = false;
  let includeYahtml = true;
  let includeExpression = false;
  let watch = false;
  let watchIntervalMs = 800;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--dirs" || arg === "--dir") {
      const value = getRequiredValue({ args, index: i, flag: arg });
      dirs.push(value);
      i += 1;
      continue;
    }

    if (arg === "--format") {
      const value = getRequiredValue({ args, index: i, flag: arg });
      if (value !== "text" && value !== "json" && value !== "sarif") {
        throw new CliArgError(`Invalid value for --format: "${value}". Expected "text", "json", or "sarif".`);
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
      includeExpression = true;
      continue;
    }

    if (arg === "--watch") {
      watch = true;
      continue;
    }

    if (arg === "--watch-interval-ms") {
      const value = getRequiredValue({ args, index: i, flag: arg });
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new CliArgError(`Invalid value for --watch-interval-ms: "${value}". Expected a positive integer.`);
      }
      watchIntervalMs = parsed;
      i += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new CliArgError(`Unknown option: ${arg}`);
    }

    throw new CliArgError(`Unexpected positional argument: ${arg}`);
  }

  return {
    help: false,
    options: {
      cwd: process.cwd(),
      dirs,
      format,
      warnAsError,
      includeYahtml,
      includeExpression,
      watch,
      watchIntervalMs,
    },
  };
};

const formatCliRuntimeErrorReport = ({ message, warnAsError = false }) => {
  const diagnostic = {
    code: "RTGL-CLI-001",
    severity: "error",
    message,
    filePath: "unknown",
  };

  return JSON.stringify({
    ok: false,
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
    diagnostics: [diagnostic],
  }, null, 2);
};

const formatCliRuntimeErrorSarif = ({ message }) => {
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
                shortDescription: { text: "CLI runtime error" },
                fullDescription: { text: "CLI runtime error" },
                defaultConfiguration: { level: "error" },
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

const main = async () => {
  let parsed;

  try {
    parsed = parseArgs(process.argv.slice(2));

    if (parsed.help) {
      console.log(USAGE);
      process.exitCode = 0;
      return;
    }

    await check(parsed.options);
  } catch (err) {
    if (err instanceof CliArgError) {
      console.error(`[Check] ${err.message}`);
      console.error("");
      console.error(USAGE);
      process.exitCode = 1;
      return;
    }

    const message = err instanceof Error ? err.message : String(err);

    if (parsed?.options?.format === "json") {
      console.log(formatCliRuntimeErrorReport({
        message,
        warnAsError: parsed.options.warnAsError,
      }));
      process.exitCode = 1;
      return;
    }
    if (parsed?.options?.format === "sarif") {
      console.log(formatCliRuntimeErrorSarif({ message }));
      process.exitCode = 1;
      return;
    }

    console.error(`[Check] ${message}`);
    process.exitCode = 1;
  }
};

await main();
