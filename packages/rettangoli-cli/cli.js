#!/usr/bin/env node

import { build, check, scaffold, watch, examples } from "@rettangoli/fe/cli";
import { check as checkContracts } from "@rettangoli/check/cli";
import { build as buildBe, check as checkBe, watch as watchBe } from "@rettangoli/be/cli";
import { generate, screenshot, report, accept } from "@rettangoli/vt/cli";
import { buildSite, watchSite, initSite } from "@rettangoli/sites/cli";
import { buildSvg } from "@rettangoli/ui/cli";
import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url)),
);

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
  .option("--watch-interval-ms <ms>", "Watch poll interval in milliseconds", parseInt, 800)
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
  .option("-p, --port <port>", "The port to use", parseInt, 3001)
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
  .option("-s, --setup-path <path>", "Custom setup file path")
  .option("-m, --middleware-dir <path>", "Custom middleware directory path")
  .option("-o, --outdir <path>", "Generated output directory")
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    if (!config.be?.dirs?.length) {
      throw new Error("be.dirs not found or empty in config");
    }

    const missingDirs = config.be.dirs.filter(
      (dir) => !existsSync(resolve(process.cwd(), dir)),
    );
    if (missingDirs.length > 0) {
      throw new Error(`Directories do not exist: ${missingDirs.join(", ")}`);
    }

    options.dirs = config.be.dirs;
    options.middlewareDir = options.middlewareDir || config.be.middlewareDir || "./src/middleware";
    options.setup = options.setupPath || config.be.setup || "./src/setup.js";
    options.outdir = options.outdir || config.be.outdir || "./.rtgl-be/generated";
    options.domainErrors = config.be.domainErrors || {};

    buildBe(options);
  });

beCommand
  .command("check")
  .description("Validate backend RPC contracts")
  .option("--format <format>", "Output format: text or json", "text")
  .option("-m, --middleware-dir <path>", "Custom middleware directory path")
  .action((options) => {
    const config = readConfig();

    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }

    if (!config.be?.dirs?.length) {
      throw new Error("be.dirs not found or empty in config");
    }

    const missingDirs = config.be.dirs.filter(
      (dir) => !existsSync(resolve(process.cwd(), dir)),
    );
    if (missingDirs.length > 0) {
      throw new Error(`Directories do not exist: ${missingDirs.join(", ")}`);
    }

    options.dirs = config.be.dirs;
    options.middlewareDir = options.middlewareDir || config.be.middlewareDir || "./src/middleware";

    checkBe(options);
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

    if (!config.be?.dirs?.length) {
      throw new Error("be.dirs not found or empty in config");
    }

    const missingDirs = config.be.dirs.filter(
      (dir) => !existsSync(resolve(process.cwd(), dir)),
    );
    if (missingDirs.length > 0) {
      throw new Error(`Directories do not exist: ${missingDirs.join(", ")}`);
    }

    options.dirs = config.be.dirs;
    options.middlewareDir = options.middlewareDir || config.be.middlewareDir || "./src/middleware";
    options.setup = options.setupPath || config.be.setup || "./src/setup.js";
    options.outdir = options.outdir || config.be.outdir || "./.rtgl-be/generated";
    options.domainErrors = config.be.domainErrors || {};

    watchBe(options);
  });

const vtCommand = program
  .command("vt")
  .description("Rettangoli Visual Testing");

vtCommand
  .command("generate")
  .description("Generate candidate HTML pages only (no screenshots)")
  .option("--concurrency <number>", "Number of parallel capture workers", parseInt)
  .option("--timeout <ms>", "Global capture timeout in ms", parseInt)
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
  .option("--concurrency <number>", "Number of parallel capture workers", parseInt)
  .option("--timeout <ms>", "Global capture timeout in ms", parseInt)
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
  .option("-p, --port <port>", "The port to use", parseInt, 3001)
  .option("-r, --root-dir <path>", "Path to root directory", ".")
  .option("--rootDir <path>", "Deprecated alias for --root-dir")
  .option("-o, --output-path <path>", "Path to destination directory", "./_site")
  .option("--outputPath <path>", "Deprecated alias for --output-path")
  .option("--reload-mode <mode>", "Reload mode: body (hot body replacement) or full (full-page reload)", "body")
  .option("-q, --quiet", "Suppress non-error logs")
  .action(async (options) => {
    watchSite({
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
