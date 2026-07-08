#!/usr/bin/env node

import { build, check, scaffold, watch, examples } from "@rettangoli/fe/cli";
import { check as checkContracts } from "@rettangoli/check/cli";
import { generate, screenshot, report, accept } from "@rettangoli/vt/cli";
import { buildSite, watchSite, initSite } from "@rettangoli/sites/cli";
import { buildSvg } from "@rettangoli/ui/cli";
import { Command, InvalidArgumentError } from "commander";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url)),
);

const localBeCliUrl = new URL("../rettangoli-be/src/cli/index.js", import.meta.url);
const beCli = existsSync(localBeCliUrl)
  ? await import(localBeCliUrl)
  : await import("@rettangoli/be/cli");

const {
  build: buildBe,
  check: checkBe,
  db: dbBe,
  manifest: manifestBe,
  resume: resumeBe,
  scaffold: scaffoldBe,
  start: startBe,
  test: testBe,
  verify: verifyBe,
  watch: watchBe,
} = beCli;

function requireBeCommand(handler, name) {
  if (typeof handler !== "function") {
    throw new Error(
      `@rettangoli/be/cli does not export '${name}'. Reinstall @rettangoli/be at the version required by rettangoli-cli.`,
    );
  }

  return handler;
}

// Function to read config file
function readConfig() {
  const configPath = resolve(process.cwd(), "rettangoli.config.yaml");

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const configContent = readFileSync(configPath, "utf8");
    return yaml.load(configContent);
  } catch (error) {
    throw new Error(`Error reading config file "${configPath}": ${error.message}`);
  }
}

function collectValues(value, previous = []) {
  return [...previous, value];
}

function parseIntegerOption(value) {
  if (!/^-?\d+$/.test(String(value))) {
    throw new InvalidArgumentError(`Expected an integer but received "${value}"`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed)) {
    throw new InvalidArgumentError(`Expected a safe integer but received "${value}"`);
  }

  return parsed;
}

function parsePortOption(value) {
  const parsed = parseIntegerOption(value);
  if (parsed < 1 || parsed > 65535) {
    throw new InvalidArgumentError(`Port must be between 1 and 65535, received "${value}"`);
  }
  return parsed;
}

function parseIsolationOption(value) {
  if (value === "fast" || value === "strict") {
    return value;
  }
  throw new InvalidArgumentError(`Isolation must be "fast" or "strict", received "${value}"`);
}

function resolveBeRuntimePaths(config) {
  const be = config?.be || {};
  const dirs = Array.isArray(be.dirs) && be.dirs.length > 0 ? be.dirs : ["./src/modules"];

  return {
    dirs,
    middlewareDir: be.middlewareDir || "./src/middleware",
    setup: be.setup || "./src/setup.js",
    outdir: be.outdir || "./.rtgl-be/generated",
    migrationsDir: be.migrationsDir || "./migrations",
    domainErrors: be.domainErrors || {},
  };
}

const program = new Command();

program
  .name("rtgl")
  .description("CLI tool for Rettangoli development")
  .version(packageJson.version);

// Add examples to main program
program.addHelpText(
  "after",
  `

Examples:
  $ rettangoli fe build
  $ rettangoli fe scaffold -c components -n Button
  $ rettangoli fe watch -p 3001
`,
);

program
  .command("check")
  .description("Run Rettangoli static contract checks")
  .option("--dir <path>", "Component directory to scan (repeatable)", collectValues, [])
  .option("--format <format>", "Output format: text, json, or sarif", "text")
  .option("--warn-as-error", "Treat warnings as errors")
  .option("--no-yahtml", "Disable YAHTML attr/prop validation")
  .option("--expr", "Enable expression scope/type checks")
  .option("--watch", "Watch for file changes and re-run checks")
  .option("--watch-interval-ms <ms>", "Watch poll interval in milliseconds", parseIntegerOption, 800)
  .addHelpText(
    "after",
    `

Examples:
  $ rtgl check
  $ rtgl check --dir src/components --format json
  $ rtgl check --warn-as-error
`,
  )
  .action(async (options) => {
    await checkContracts({
      cwd: process.cwd(),
      dirs: options.dir,
      format: options.format,
      warnAsError: !!options.warnAsError,
      includeYahtml: options.yahtml !== false,
      includeExpression: !!options.expr,
      watch: !!options.watch,
      watchIntervalMs: Number.isFinite(options.watchIntervalMs) ? options.watchIntervalMs : 800,
    });
  });

const feCommand = program.command("fe").description("Frontend framework");

feCommand
  .command("build")
  .description("Build UI components")
  .option("-o, --outfile <path>", "The output file")
  .option("-s, --setup-path <path>", "Custom setup file path")
  .option("-d, --development", "Development mode (no minification, no source maps)")
  .addHelpText(
    "after",
    `

Examples:
  $ rettangoli fe build
  $ rettangoli fe build --outfile ./dist/bundle.js
  $ rettangoli fe build -o ./public/js/main.js
  $ rettangoli fe build --development
  $ rettangoli fe build -d -o ./dist/dev.js
  $ rettangoli fe build -s src/setup.tauri.js
  $ rettangoli fe build --setup-path src/setup.web.js
`,
  )
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    if (!config.fe?.dirs?.length) {
      throw new Error("fe.dirs not found or empty in config");
    }

    // Validate that directories exist
    const missingDirs = config.fe.dirs.filter(
      (dir) => !existsSync(resolve(process.cwd(), dir)),
    );
    if (missingDirs.length > 0) {
      throw new Error(`Directories do not exist: ${missingDirs.join(", ")}`);
    }

    // Pass dirs, setup, and outfile from config
    options.dirs = config.fe.dirs;
    options.i18n = config.fe.i18n || null;
    // Use setup-path if provided, otherwise use config setup
    options.setup = options.setupPath || config.fe.setup || "setup.js";

    // Use config outfile if not specified via CLI option
    if (!options.outfile && config.fe.outfile) {
      options.outfile = config.fe.outfile;
    }

    build(options);
  });

feCommand
  .command("check")
  .description("Validate frontend component file contracts")
  .option("--format <format>", "Output format: text or json", "text")
  .addHelpText(
    "after",
    `

Examples:
  $ rettangoli fe check
  $ rettangoli fe check --format json
`,
  )
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    if (!config.fe?.dirs?.length) {
      throw new Error("fe.dirs not found or empty in config");
    }

    const missingDirs = config.fe.dirs.filter(
      (dir) => !existsSync(resolve(process.cwd(), dir)),
    );
    if (missingDirs.length > 0) {
      throw new Error(`Directories do not exist: ${missingDirs.join(", ")}`);
    }

    options.dirs = config.fe.dirs;
    options.i18n = config.fe.i18n || null;
    check(options);
  });

feCommand
  .command("scaffold")
  .description("Scaffold UI components")
  .option("-d, --dir <dir>", "The directory to scaffold", "./example")
  .option("-c, --category <category>", "The category of the component", "pages")
  .option(
    "-n, --component-name <component-name>",
    "The name of the component",
    "component-name",
  )
  .addHelpText(
    "after",
    `

Examples:
  $ rettangoli fe scaffold
  $ rettangoli fe scaffold --category components --name MyButton
  $ rettangoli fe scaffold -c layouts -n HeaderLayout
  $ rettangoli fe scaffold -c pages -n HomePage
`,
  )
  .action((options) => {
    scaffold(options);
  });

feCommand
  .command("watch")
  .description("Watch for changes")
  .option("-p, --port <port>", "The port to use", parsePortOption, 3001)
  .option("-s, --setup-path <path>", "Custom setup file path")
  .addHelpText(
    "after",
    `

Examples:
  $ rettangoli fe watch
  $ rettangoli fe watch --port 8080
  $ rettangoli fe watch -p 4000
  $ rettangoli fe watch -s src/setup.tauri.js
  $ rettangoli fe watch --setup-path src/setup.web.js
`,
  )
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    if (!config.fe?.dirs?.length) {
      throw new Error("fe.dirs not found or empty in config");
    }

    // Validate that directories exist
    const missingDirs = config.fe.dirs.filter(
      (dir) => !existsSync(resolve(process.cwd(), dir)),
    );
    if (missingDirs.length > 0) {
      throw new Error(`Directories do not exist: ${missingDirs.join(", ")}`);
    }

    // Pass dirs, setup, and outfile from config
    options.dirs = config.fe.dirs;
    options.i18n = config.fe.i18n || null;
    // Use setup-path if provided, otherwise use config setup
    options.setup = options.setupPath || config.fe.setup || "setup.js";

    // Use config outfile if not specified via CLI option
    if (!options.outfile && config.fe.outfile) {
      options.outfile = config.fe.outfile;
    }

    watch(options);
  });

feCommand
  .command("examples")
  .description("Generate examples")
  .action((options) => {
    const config = readConfig();
    options.dirs = config.fe.dirs;
    options.outputDir = config.fe?.examples?.outputDir || "./vt/specs/examples";
    examples(options);
  });

const beCommand = program.command("be").description("Backend framework");

beCommand
  .command("build")
  .description("Build backend method registry and app entry")
  .option("--dir <path>", "Backend method directory to scan (repeatable)", collectValues, [])
  .option("-s, --setup-path <path>", "Custom setup file path")
  .option("-m, --middleware-dir <path>", "Custom middleware directory path")
  .option("-o, --outdir <path>", "Generated output directory")
  .option("--dry-run", "Print the deterministic build plan without writing files")
  .option("--check", "Check whether generated files are fresh")
  .option("--json", "Output JSON")
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    const bePaths = resolveBeRuntimePaths(config);

    const selectedDirs = options.dir.length > 0 ? options.dir : bePaths.dirs;
    const missingDirs = selectedDirs.filter(
      (dir) => !existsSync(resolve(process.cwd(), dir)),
    );
    if (missingDirs.length > 0) {
      throw new Error(`Directories do not exist: ${missingDirs.join(", ")}`);
    }

    options.dirs = selectedDirs;
    options.middlewareDir = options.middlewareDir || bePaths.middlewareDir;
    options.setup = options.setupPath || bePaths.setup;
    options.outdir = options.outdir || bePaths.outdir;
    options.domainErrors = bePaths.domainErrors;
    if (options.json) options.format = "json";

    buildBe(options);
  });

beCommand
  .command("check")
  .description("Validate backend RPC contracts")
  .option("--format <format>", "Output format: text or json", "text")
  .option("--json", "Output JSON")
  .option("--dir <path>", "Backend method directory to scan (repeatable)", collectValues, [])
  .option("--method <method>", "Validate one backend method id")
  .option("-m, --middleware-dir <path>", "Custom middleware directory path")
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    const bePaths = resolveBeRuntimePaths(config);

    options.dirs = options.dir.length > 0 ? options.dir : bePaths.dirs;
    options.middlewareDir = options.middlewareDir || bePaths.middlewareDir;
    if (options.json) options.format = "json";

    checkBe(options);
  });

beCommand
  .command("manifest")
  .description("Print deterministic backend API manifest")
  .option("--json", "Output JSON")
  .option("--dir <path>", "Backend method directory to scan (repeatable)", collectValues, [])
  .option("--method <method>", "Print manifest for one backend method id")
  .option("-m, --middleware-dir <path>", "Custom middleware directory path")
  .option("--outdir <path>", "Generated output directory used for target facts")
  .option("--migrations-dir <path>", "SQLite migrations directory")
  .option("-o, --output <path>", "Write manifest JSON to a file")
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    const bePaths = resolveBeRuntimePaths(config);

    options.dirs = options.dir.length > 0 ? options.dir : bePaths.dirs;
    options.middlewareDir = options.middlewareDir || bePaths.middlewareDir;
    options.outdir = options.outdir || bePaths.outdir;
    options.migrationsDir = options.migrationsDir || bePaths.migrationsDir;

    requireBeCommand(manifestBe, "manifest")(options);
  });

beCommand
  .command("test")
  .description("Run backend executable examples")
  .option("--format <format>", "Output format: text or json", "text")
  .option("--json", "Output JSON")
  .option("--dir <path>", "Backend method directory to scan (repeatable)", collectValues, [])
  .option("--method <method>", "Run examples for one backend method id")
  .option("-m, --middleware-dir <path>", "Custom middleware directory path")
  .option("--config <path>", "Vitest config path", "./vitest.config.js")
  .option("--test-config <path>", "Alias for --config")
  .option("--package-manager <name>", "Package manager for running Vitest: npm, pnpm, yarn, bun")
  .option("--runner <command>", "Executable used to run Vitest")
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    const bePaths = resolveBeRuntimePaths(config);

    options.dirs = options.dir.length > 0 ? options.dir : bePaths.dirs;
    options.middlewareDir = options.middlewareDir || bePaths.middlewareDir;
    options.config = options.testConfig || options.config;
    options.executable = options.runner;
    if (options.json) options.format = "json";

    requireBeCommand(testBe, "test")(options);
  });

beCommand
  .command("verify")
  .description("Run backend check, build, manifest, and examples")
  .option("--format <format>", "Output format: text or json", "text")
  .option("--json", "Output JSON")
  .option("--dir <path>", "Backend method directory to scan (repeatable)", collectValues, [])
  .option("--method <method>", "Verify one backend method id")
  .option("-s, --setup-path <path>", "Custom setup file path")
  .option("-m, --middleware-dir <path>", "Custom middleware directory path")
  .option("-o, --outdir <path>", "Generated output directory")
  .option("--migrations-dir <path>", "SQLite migrations directory")
  .option("--evidence <taskId>", "Write verification evidence under .rtgl-be/evidence")
  .option("--task-id <taskId>", "Task id for verification evidence")
  .option("--config <path>", "Alias for --test-config")
  .option("--test-config <path>", "Vitest config path", "./vitest.config.js")
  .option("--package-manager <name>", "Package manager for running Vitest: npm, pnpm, yarn, bun")
  .option("--runner <command>", "Executable used to run Vitest")
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    const bePaths = resolveBeRuntimePaths(config);

    options.dirs = options.dir.length > 0 ? options.dir : bePaths.dirs;
    options.middlewareDir = options.middlewareDir || bePaths.middlewareDir;
    options.setup = options.setupPath || bePaths.setup;
    options.outdir = options.outdir || bePaths.outdir;
    options.migrationsDir = options.migrationsDir || bePaths.migrationsDir;
    options.testConfig = options.config || options.testConfig;
    options.executable = options.runner;
    if (options.json) options.format = "json";

    requireBeCommand(verifyBe, "verify")(options);
  });

beCommand
  .command("scaffold [methodId]")
  .description("Scaffold a backend method package")
  .option("--method <method>", "Backend method id, e.g. user.getProfile")
  .option("--dir <path>", "Backend method directory to create under")
  .option("--dry-run", "Print the scaffold plan without writing files")
  .option("--check", "Alias for --dry-run")
  .option("--json", "Output JSON")
  .action((methodId, options) => {
    const config = readConfig();
    const bePaths = resolveBeRuntimePaths(config);

    options.methodId = options.method || methodId;
    options.dirs = options.dir || bePaths.dirs[0] || "./src/modules";
    if (options.json) options.format = "json";
    requireBeCommand(scaffoldBe, "scaffold")(options);
  });

const beDbCommand = beCommand.command("db").description("SQLite backend database checks");

beDbCommand
  .command("check")
  .description("Validate and replay SQLite migrations")
  .option("--json", "Output JSON")
  .option("--migrations-dir <path>", "SQLite migrations directory")
  .option("--fail-on-warnings", "Return non-zero when warnings are present")
  .action((options) => {
    const config = readConfig();
    const bePaths = resolveBeRuntimePaths(config);

    options.migrationsDir = options.migrationsDir || bePaths.migrationsDir;
    options.failOnWarnings = !!options.failOnWarnings;
    if (options.json) options.format = "json";

    requireBeCommand(dbBe, "db")(options);
  });

beCommand
  .command("resume <taskId>")
  .description("Resume a backend verification task anchor")
  .option("--json", "Output JSON")
  .action((taskId, options) => {
    options.taskId = taskId;
    if (options.json) options.format = "json";
    requireBeCommand(resumeBe, "resume")(options);
  });

beCommand
  .command("start")
  .description("Start backend HTTP server")
  .option("--host <host>", "Override host from config")
  .option("--port <port>", "Override port from config", parsePortOption)
  .action(async (options) => {
    const startOptions = {
      cwd: process.cwd(),
    };

    if (options.host) {
      startOptions.host = options.host;
    }

    if (options.port !== undefined) {
      startOptions.port = options.port;
    }

    await startBe(startOptions);
  });

beCommand
  .command("watch")
  .description("Watch backend files and rebuild generated registry")
  .option("-s, --setup-path <path>", "Custom setup file path")
  .option("-m, --middleware-dir <path>", "Custom middleware directory path")
  .option("-o, --outdir <path>", "Generated output directory")
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    const bePaths = resolveBeRuntimePaths(config);

    const missingDirs = bePaths.dirs.filter(
      (dir) => !existsSync(resolve(process.cwd(), dir)),
    );
    if (missingDirs.length > 0) {
      throw new Error(`Directories do not exist: ${missingDirs.join(", ")}`);
    }

    options.dirs = bePaths.dirs;
    options.middlewareDir = options.middlewareDir || bePaths.middlewareDir;
    options.setup = options.setupPath || bePaths.setup;
    options.outdir = options.outdir || bePaths.outdir;
    options.domainErrors = bePaths.domainErrors;

    watchBe(options);
  });

const vtCommand = program
  .command("vt")
  .description("Rettangoli Visual Testing");

vtCommand
  .command("generate")
  .description("Generate candidate HTML pages only (no screenshots)")
  .option("--concurrency <number>", "Number of parallel capture workers", parseIntegerOption)
  .option("--timeout <ms>", "Global capture timeout in ms", parseIntegerOption)
  .option("--wait-event <name>", "Custom event name to mark page ready (uses event wait strategy)")
  .option("--folder <path>", "Run only specs under folder prefix (repeatable)", collectValues, [])
  .option("--group <section-key>", "Run only one section key from vt.sections (repeatable)", collectValues, [])
  .option("--item <spec-path>", "Run only one spec path relative to vt/specs (repeatable)", collectValues, [])
  .option("--headed", "Run Playwright in headed mode")
  .action(async (options) => {
    console.log(`rtgl v${packageJson.version}`);
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    // Use vt.path from config, default to 'vt'
    options.vtPath = config.vt?.path || "vt";
    if (options.headed) {
      options.headless = false;
    }
    options.captureScreenshots = false;

    await generate(options);
  });

vtCommand
  .command("screenshot")
  .description("Generate candidate HTML pages and capture screenshots")
  .option("--concurrency <number>", "Number of parallel capture workers", parseIntegerOption)
  .option("--timeout <ms>", "Global capture timeout in ms", parseIntegerOption)
  .option("--wait-event <name>", "Custom event name to mark page ready (uses event wait strategy)")
  .option("--isolation <mode>", "Isolation mode: fast or strict", parseIsolationOption)
  .option("--folder <path>", "Run only specs under folder prefix (repeatable)", collectValues, [])
  .option("--group <section-key>", "Run only one section key from vt.sections (repeatable)", collectValues, [])
  .option("--item <spec-path>", "Run only one spec path relative to vt/specs (repeatable)", collectValues, [])
  .option("--headed", "Run Playwright in headed mode")
  .action(async (options) => {
    console.log(`rtgl v${packageJson.version}`);
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    options.vtPath = config.vt?.path || "vt";
    if (options.headed) {
      options.headless = false;
    }
    await screenshot(options);
  });

vtCommand
  .command("report")
  .description("Create reports")
  .option("--compare-method <method>", "Comparison method: pixelmatch or md5")
  .option("--color-threshold <number>", "Color threshold for pixelmatch (0-1)", parseFloat)
  .option("--diff-threshold <number>", "Max diff pixels percentage to pass (0-100)", parseFloat)
  .option("--folder <path>", "Compare only screenshots under folder prefix (repeatable)", collectValues, [])
  .option("--group <section-key>", "Compare only one section key from vt.sections (repeatable)", collectValues, [])
  .option("--item <spec-path>", "Compare only one spec path relative to vt/specs (repeatable)", collectValues, [])
  .action(async (options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    const vtPath = config.vt?.path || "vt";
    await report({
      vtPath,
      compareMethod: options.compareMethod,
      colorThreshold: options.colorThreshold,
      diffThreshold: options.diffThreshold,
      folder: options.folder,
      group: options.group,
      item: options.item,
    });
  });

vtCommand
  .command("accept")
  .description("Accept changes")
  .action(async () => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    const vtPath = config.vt?.path || "vt";
    await accept({ vtPath });
  });

const sitesCommand = program.command("sites").description("Rettangoli Sites");

sitesCommand
  .command("init <project-name>")
  .description("Initialize a new site from template")
  .option("-t, --template <name>", "Template to use", "default")
  .action((projectName, options) => {
    initSite({
      projectName,
      template: options.template,
    });
  });

sitesCommand
  .command("build")
  .description("Build the site")
  .option("-r, --root-dir <path>", "Path to root directory", "./")
  .option("--rootDir <path>", "Deprecated alias for --root-dir")
  .option("-o, --output-path <path>", "Path to destination directory", "./_site")
  .option("--outputPath <path>", "Deprecated alias for --output-path")
  .option("-q, --quiet", "Suppress non-error logs")
  .action(async (options) => {
    await buildSite({
      rootDir: options.rootDir,
      outputPath: options.outputPath,
      quiet: !!options.quiet,
    });
    if (!options.quiet) {
      console.log("Build completed successfully!");
    }
  });

sitesCommand
  .command("watch")
  .description("Watch and rebuild site on changes")
  .option("-p, --port <port>", "The port to use", parsePortOption, 3001)
  .option("-r, --root-dir <path>", "Path to root directory", ".")
  .option("--rootDir <path>", "Deprecated alias for --root-dir")
  .option("-o, --output-path <path>", "Path to destination directory", "./_site")
  .option("--outputPath <path>", "Deprecated alias for --output-path")
  .option("--reload-mode <mode>", "Reload mode: body (hot body replacement) or full (full-page reload)", "body")
  .option("-q, --quiet", "Suppress non-error logs")
  .action(async (options) => {
    await watchSite({
      port: options.port,
      rootDir: options.rootDir,
      outputPath: options.outputPath,
      reloadMode: options.reloadMode,
      quiet: !!options.quiet,
    });
  });

const uiCommand = program.command("ui").description("UI component tools");

uiCommand
  .command("build-svg")
  .description("Build SVG icons from directory")
  .option("-d, --dir <dir>", "Directory containing SVG files")
  .option("-o, --outfile <path>", "Output file path")
  .addHelpText(
    "after",
    `

Examples:
  $ rettangoli ui build-svg
  $ rettangoli ui build-svg --dir ./icons --outfile ./dist/icons.js
  $ rettangoli ui build-svg -d ./assets/svg -o ./public/js/icons.js
`,
  )
  .action((options) => {
    const config = readConfig();

    // Use config values if options not provided
    if (!options.dir && config?.ui?.svg?.dir) {
      options.dir = config.ui.svg.dir;
    }
    if (!options.outfile && config?.ui?.svg?.outfile) {
      options.outfile = config.ui.svg.outfile;
    }

    // Check if required options are available (either from CLI or config)
    if (!options.dir || !options.outfile) {
      console.error("Error: Both dir and outfile are required. Provide them via CLI options or in rettangoli.config.yaml under ui.svg");
      process.exit(1);
    }

    buildSvg(options);
  });

await program.parseAsync();
