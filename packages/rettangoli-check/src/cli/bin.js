#!/usr/bin/env node
import check from "./check.js";
import compile from "./compile.js";
import doctor from "./doctor.js";
import lsp from "./lsp.js";
import { baselineCapture, baselineVerify } from "./baseline.js";
import { runPolicyValidateCommand, validatePolicyPacks } from "./policy.js";
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
  "  --expr              Enable template expression root checks",
  "  --autofix           Apply safe autofixes in place",
  "  --autofix-dry-run   Preview safe autofixes without writing files",
  "  --autofix-min-confidence <0-1> Minimum confidence threshold (default: 0.9)",
  "  --autofix-patch     Include patch output for autofix candidates",
  "  --watch             Re-run check when files change (polling)",
  "  --watch-interval-ms Poll interval in milliseconds (default: 800)",
  "  -h, --help          Show this help",
].join("\n");

const COMPILE_USAGE = [
  "Usage: rtgl-check compile [options]",
  "",
  "Options:",
  "  --dir <path>        Component directory (repeatable)",
  "  --dirs <path>       Alias for --dir",
  "  --format <value>    Report format: text | json",
  "  --warn-as-error     Treat warnings as errors",
  "  --no-yahtml         Disable YAHTML attribute checks",
  "  --expr              Enable template expression root checks",
  "  --out-dir <path>    Artifact output directory (default: .rettangoli/compile)",
  "  --no-emit-artifact  Run compile analysis without writing artifact file",
  "  --mode <value>      strict | local-non-authoritative (default: strict)",
  "  --policy-pack <p>   Policy pack path (repeatable)",
  "  -h, --help          Show this help",
].join("\n");

const DOCTOR_USAGE = [
  "Usage: rtgl-check doctor [options]",
  "",
  "Options:",
  "  --dir <path>        Component directory (repeatable)",
  "  --dirs <path>       Alias for --dir",
  "  --format <value>    Report format: text | json",
  "  -h, --help          Show this help",
].join("\n");

const LSP_USAGE = [
  "Usage: rtgl-check lsp [options]",
  "",
  "Options:",
  "  --dir <path>        Component directory (repeatable)",
  "  --dirs <path>       Alias for --dir",
  "  --stdio             Use stdio transport (default)",
  "  -h, --help          Show this help",
].join("\n");

const BASELINE_USAGE = [
  "Usage: rtgl-check baseline <capture|verify> [options]",
  "",
  "Options:",
  "  --dir <path>        Component directory (repeatable)",
  "  --dirs <path>       Alias for --dir",
  "  --file <path>       Baseline file path (default: .rettangoli/baseline.json)",
  "  --format <value>    Report format: text | json",
  "  --no-yahtml         Disable YAHTML attribute checks",
  "  --expr              Enable template expression root checks",
  "  -h, --help          Show this help",
].join("\n");

const POLICY_USAGE = [
  "Usage: rtgl-check policy <validate> [options]",
  "",
  "Options:",
  "  --file <path>       Policy pack file path",
  "  --verify-signature  Require and verify policy pack signature",
  "  --format <value>    Report format: text | json",
  "  -h, --help          Show this help",
].join("\n");

class CliArgError extends Error {
  constructor(message, { command = "check", usage = CHECK_USAGE } = {}) {
    super(message);
    this.name = "CliArgError";
    this.command = command;
    this.usage = usage;
  }
}

const commandLabel = (command = "check") => {
  if (command === "compile") {
    return "Compile";
  }
  if (command === "doctor") {
    return "Doctor";
  }
  if (command === "lsp") {
    return "LSP";
  }
  if (command === "baseline") {
    return "Baseline";
  }
  if (command === "policy") {
    return "Policy";
  }
  return "Check";
};

const getRequiredValue = ({ args, index, flag, command, usage }) => {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new CliArgError(`Missing value for ${flag}.`, { command, usage });
  }
  return value;
};

const parseMode = ({ value, command, usage }) => {
  if (value !== "strict" && value !== "local-non-authoritative") {
    throw new CliArgError(`Invalid value for --mode: "${value}". Expected "strict" or "local-non-authoritative".`, {
      command,
      usage,
    });
  }
  return value;
};

const parseCheckArgs = (args = []) => {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true, usage: CHECK_USAGE, command: "check" };
  }

  const dirs = [];
  const policyPacks = [];
  let format = "text";
  let warnAsError = false;
  let includeYahtml = true;
  let includeExpression = false;
  let watch = false;
  let watchIntervalMs = 800;
  let mode = "strict";
  let autofixMode = "off";
  let autofixMinConfidence = 0.9;
  let autofixPatch = false;
  let autofixMinConfidenceSet = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--dirs" || arg === "--dir") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "check", usage: CHECK_USAGE });
      dirs.push(value);
      i += 1;
      continue;
    }

    if (arg === "--format") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "check", usage: CHECK_USAGE });
      if (value !== "text" && value !== "json" && value !== "sarif") {
        throw new CliArgError(`Invalid value for --format: "${value}". Expected "text", "json", or "sarif".`, {
          command: "check",
          usage: CHECK_USAGE,
        });
      }
      format = value;
      i += 1;
      continue;
    }

    if (arg === "--mode") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "check", usage: CHECK_USAGE });
      mode = parseMode({ value, command: "check", usage: CHECK_USAGE });
      i += 1;
      continue;
    }

    if (arg === "--policy-pack") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "check", usage: CHECK_USAGE });
      policyPacks.push(value);
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

    if (arg === "--autofix") {
      if (autofixMode === "dry-run") {
        throw new CliArgError("Cannot combine --autofix with --autofix-dry-run.", {
          command: "check",
          usage: CHECK_USAGE,
        });
      }
      autofixMode = "apply";
      continue;
    }

    if (arg === "--autofix-dry-run") {
      if (autofixMode === "apply") {
        throw new CliArgError("Cannot combine --autofix with --autofix-dry-run.", {
          command: "check",
          usage: CHECK_USAGE,
        });
      }
      autofixMode = "dry-run";
      continue;
    }

    if (arg === "--autofix-patch") {
      autofixPatch = true;
      if (autofixMode === "off") {
        autofixMode = "dry-run";
      }
      continue;
    }

    if (arg === "--autofix-min-confidence") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "check", usage: CHECK_USAGE });
      const parsed = Number.parseFloat(value);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        throw new CliArgError(`Invalid value for --autofix-min-confidence: "${value}". Expected a number in [0, 1].`, {
          command: "check",
          usage: CHECK_USAGE,
        });
      }
      autofixMinConfidence = parsed;
      autofixMinConfidenceSet = true;
      i += 1;
      continue;
    }

    if (arg === "--watch") {
      watch = true;
      continue;
    }

    if (arg === "--watch-interval-ms") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "check", usage: CHECK_USAGE });
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new CliArgError(`Invalid value for --watch-interval-ms: "${value}". Expected a positive integer.`, {
          command: "check",
          usage: CHECK_USAGE,
        });
      }
      watchIntervalMs = parsed;
      i += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new CliArgError(`Unknown option: ${arg}`, { command: "check", usage: CHECK_USAGE });
    }

    throw new CliArgError(`Unexpected positional argument: ${arg}`, { command: "check", usage: CHECK_USAGE });
  }

  if (autofixMode === "off" && autofixMinConfidenceSet) {
    throw new CliArgError("Cannot use --autofix-min-confidence without --autofix or --autofix-dry-run.", {
      command: "check",
      usage: CHECK_USAGE,
    });
  }

  return {
    help: false,
    usage: CHECK_USAGE,
    command: "check",
    options: {
      cwd: process.cwd(),
      dirs,
      format,
      warnAsError,
      includeYahtml,
      includeExpression,
      watch,
      watchIntervalMs,
      mode,
      policyPacks,
      autofixMode,
      autofixMinConfidence,
      autofixPatch,
    },
  };
};

const parseCompileArgs = (args = []) => {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true, usage: COMPILE_USAGE, command: "compile" };
  }

  const dirs = [];
  const policyPacks = [];
  let format = "text";
  let warnAsError = false;
  let includeYahtml = true;
  let includeExpression = false;
  let outDir = ".rettangoli/compile";
  let emitArtifact = true;
  let mode = "strict";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--dirs" || arg === "--dir") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "compile", usage: COMPILE_USAGE });
      dirs.push(value);
      i += 1;
      continue;
    }

    if (arg === "--format") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "compile", usage: COMPILE_USAGE });
      if (value !== "text" && value !== "json") {
        throw new CliArgError(`Invalid value for --format: "${value}". Expected "text" or "json".`, {
          command: "compile",
          usage: COMPILE_USAGE,
        });
      }
      format = value;
      i += 1;
      continue;
    }

    if (arg === "--out-dir") {
      outDir = getRequiredValue({ args, index: i, flag: arg, command: "compile", usage: COMPILE_USAGE });
      i += 1;
      continue;
    }

    if (arg === "--mode") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "compile", usage: COMPILE_USAGE });
      mode = parseMode({ value, command: "compile", usage: COMPILE_USAGE });
      i += 1;
      continue;
    }

    if (arg === "--policy-pack") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "compile", usage: COMPILE_USAGE });
      policyPacks.push(value);
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

    if (arg === "--no-emit-artifact") {
      emitArtifact = false;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new CliArgError(`Unknown option: ${arg}`, { command: "compile", usage: COMPILE_USAGE });
    }

    throw new CliArgError(`Unexpected positional argument: ${arg}`, { command: "compile", usage: COMPILE_USAGE });
  }

  return {
    help: false,
    usage: COMPILE_USAGE,
    command: "compile",
    options: {
      cwd: process.cwd(),
      dirs,
      format,
      warnAsError,
      includeYahtml,
      includeExpression,
      outDir,
      emitArtifact,
      mode,
      policyPacks,
    },
  };
};

const parseDoctorArgs = (args = []) => {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true, usage: DOCTOR_USAGE, command: "doctor" };
  }

  const dirs = [];
  let format = "text";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--dirs" || arg === "--dir") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "doctor", usage: DOCTOR_USAGE });
      dirs.push(value);
      i += 1;
      continue;
    }

    if (arg === "--format") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "doctor", usage: DOCTOR_USAGE });
      if (value !== "text" && value !== "json") {
        throw new CliArgError(`Invalid value for --format: "${value}". Expected "text" or "json".`, {
          command: "doctor",
          usage: DOCTOR_USAGE,
        });
      }
      format = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new CliArgError(`Unknown option: ${arg}`, { command: "doctor", usage: DOCTOR_USAGE });
    }

    throw new CliArgError(`Unexpected positional argument: ${arg}`, { command: "doctor", usage: DOCTOR_USAGE });
  }

  return {
    help: false,
    usage: DOCTOR_USAGE,
    command: "doctor",
    options: {
      cwd: process.cwd(),
      dirs,
      format,
    },
  };
};

const parseLspArgs = (args = []) => {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true, usage: LSP_USAGE, command: "lsp" };
  }

  const dirs = [];
  let stdio = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--dirs" || arg === "--dir") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "lsp", usage: LSP_USAGE });
      dirs.push(value);
      i += 1;
      continue;
    }

    if (arg === "--stdio") {
      stdio = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new CliArgError(`Unknown option: ${arg}`, { command: "lsp", usage: LSP_USAGE });
    }

    throw new CliArgError(`Unexpected positional argument: ${arg}`, { command: "lsp", usage: LSP_USAGE });
  }

  return {
    help: false,
    usage: LSP_USAGE,
    command: "lsp",
    options: {
      cwd: process.cwd(),
      dirs,
      stdio,
    },
  };
};

const parseBaselineArgs = (args = []) => {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true, usage: BASELINE_USAGE, command: "baseline" };
  }

  const action = args[0];
  if (!action || action.startsWith("-")) {
    throw new CliArgError("Missing baseline action. Expected 'capture' or 'verify'.", {
      command: "baseline",
      usage: BASELINE_USAGE,
    });
  }

  if (action !== "capture" && action !== "verify") {
    throw new CliArgError(`Unknown baseline action: ${action}`, {
      command: "baseline",
      usage: BASELINE_USAGE,
    });
  }

  const dirs = [];
  let includeYahtml = true;
  let includeExpression = false;
  let format = "text";
  let filePath = ".rettangoli/baseline.json";

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--dirs" || arg === "--dir") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "baseline", usage: BASELINE_USAGE });
      dirs.push(value);
      i += 1;
      continue;
    }

    if (arg === "--file") {
      filePath = getRequiredValue({ args, index: i, flag: arg, command: "baseline", usage: BASELINE_USAGE });
      i += 1;
      continue;
    }

    if (arg === "--format") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "baseline", usage: BASELINE_USAGE });
      if (value !== "text" && value !== "json") {
        throw new CliArgError(`Invalid value for --format: "${value}". Expected "text" or "json".`, {
          command: "baseline",
          usage: BASELINE_USAGE,
        });
      }
      format = value;
      i += 1;
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

    if (arg.startsWith("-")) {
      throw new CliArgError(`Unknown option: ${arg}`, { command: "baseline", usage: BASELINE_USAGE });
    }

    throw new CliArgError(`Unexpected positional argument: ${arg}`, { command: "baseline", usage: BASELINE_USAGE });
  }

  return {
    help: false,
    usage: BASELINE_USAGE,
    command: "baseline",
    action,
    options: {
      cwd: process.cwd(),
      dirs,
      format,
      includeYahtml,
      includeExpression,
      filePath,
    },
  };
};

const parsePolicyArgs = (args = []) => {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true, usage: POLICY_USAGE, command: "policy" };
  }

  const action = args[0];
  if (!action || action.startsWith("-")) {
    throw new CliArgError("Missing policy action. Expected 'validate'.", {
      command: "policy",
      usage: POLICY_USAGE,
    });
  }

  if (action !== "validate") {
    throw new CliArgError(`Unknown policy action: ${action}`, {
      command: "policy",
      usage: POLICY_USAGE,
    });
  }

  let filePath = "";
  let format = "text";
  let verifySignature = false;

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--file") {
      filePath = getRequiredValue({ args, index: i, flag: arg, command: "policy", usage: POLICY_USAGE });
      i += 1;
      continue;
    }

    if (arg === "--format") {
      const value = getRequiredValue({ args, index: i, flag: arg, command: "policy", usage: POLICY_USAGE });
      if (value !== "text" && value !== "json") {
        throw new CliArgError(`Invalid value for --format: "${value}". Expected "text" or "json".`, {
          command: "policy",
          usage: POLICY_USAGE,
        });
      }
      format = value;
      i += 1;
      continue;
    }

    if (arg === "--verify-signature") {
      verifySignature = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new CliArgError(`Unknown option: ${arg}`, { command: "policy", usage: POLICY_USAGE });
    }

    throw new CliArgError(`Unexpected positional argument: ${arg}`, { command: "policy", usage: POLICY_USAGE });
  }

  if (!filePath) {
    throw new CliArgError("Missing required --file for policy validate.", {
      command: "policy",
      usage: POLICY_USAGE,
    });
  }

  return {
    help: false,
    usage: POLICY_USAGE,
    command: "policy",
    action,
    options: {
      cwd: process.cwd(),
      filePath,
      format,
      verifySignature,
    },
  };
};

const resolveCommand = (args = []) => {
  const command = args[0];
  if (!command || command.startsWith("-")) {
    return {
      command: "check",
      args,
    };
  }

  if (["check", "compile", "doctor", "lsp", "baseline", "policy"].includes(command)) {
    return {
      command,
      args: args.slice(1),
    };
  }

  return {
    command: "check",
    args,
  };
};

const formatCliRuntimeErrorReport = ({ message, command = "check", warnAsError = false }) => {
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
    command,
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

const main = async () => {
  let parsed = null;

  try {
    const route = resolveCommand(process.argv.slice(2));

    if (route.command === "check") {
      parsed = parseCheckArgs(route.args);
      if (parsed.help) {
        console.log(parsed.usage);
        process.exitCode = 0;
        return;
      }

      if (parsed.options.mode === "local-non-authoritative" && process.env.CI === "true") {
        throw new Error("local-non-authoritative mode is not allowed in CI.");
      }

      validatePolicyPacks({
        cwd: parsed.options.cwd,
        policyPacks: parsed.options.policyPacks,
      });

      await check(parsed.options);
      return;
    }

    if (route.command === "compile") {
      parsed = parseCompileArgs(route.args);
      if (parsed.help) {
        console.log(parsed.usage);
        process.exitCode = 0;
        return;
      }
      await compile(parsed.options);
      return;
    }

    if (route.command === "doctor") {
      parsed = parseDoctorArgs(route.args);
      if (parsed.help) {
        console.log(parsed.usage);
        process.exitCode = 0;
        return;
      }
      await doctor(parsed.options);
      return;
    }

    if (route.command === "lsp") {
      parsed = parseLspArgs(route.args);
      if (parsed.help) {
        console.log(parsed.usage);
        process.exitCode = 0;
        return;
      }
      await lsp(parsed.options);
      return;
    }

    if (route.command === "baseline") {
      parsed = parseBaselineArgs(route.args);
      if (parsed.help) {
        console.log(parsed.usage);
        process.exitCode = 0;
        return;
      }
      if (parsed.action === "capture") {
        await baselineCapture({
          cwd: parsed.options.cwd,
          dirs: parsed.options.dirs,
          outFile: parsed.options.filePath,
          includeYahtml: parsed.options.includeYahtml,
          includeExpression: parsed.options.includeExpression,
          format: parsed.options.format,
        });
        return;
      }
      await baselineVerify({
        cwd: parsed.options.cwd,
        dirs: parsed.options.dirs,
        baselineFile: parsed.options.filePath,
        includeYahtml: parsed.options.includeYahtml,
        includeExpression: parsed.options.includeExpression,
        format: parsed.options.format,
      });
      return;
    }

    parsed = parsePolicyArgs(route.args);
    if (parsed.help) {
      console.log(parsed.usage);
      process.exitCode = 0;
      return;
    }
    runPolicyValidateCommand({
      cwd: parsed.options.cwd,
      filePath: parsed.options.filePath,
      format: parsed.options.format,
      verifySignature: parsed.options.verifySignature,
    });
    process.exitCode = 0;
  } catch (err) {
    if (err instanceof CliArgError) {
      console.error(`[${commandLabel(err.command)}] ${err.message}`);
      console.error("");
      console.error(err.usage);
      process.exitCode = 1;
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    const format = parsed?.options?.format || "text";
    const command = parsed?.command || "check";

    if (format === "json") {
      console.log(formatCliRuntimeErrorReport({
        message,
        command,
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

    console.error(`[${commandLabel(command)}] ${message}`);
    process.exitCode = 1;
  }
};

await main();
