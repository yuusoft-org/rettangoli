#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { readConfig, requireConfig } from "./src/config.js";
import { CliUserError, runWithErrorBoundary } from "./src/errors.js";
import { resolveFeOptions } from "./src/fe-config.js";
import {
  collectValues,
  parseIntegerOption,
  parseIsolationOption,
  parseNumberOption,
  parsePortOption,
} from "./src/options.js";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url)),
);

const requestedCommand = process.argv[2];

let build;
let check;
let scaffold;
let watch;
let resolveFeServeContext;
let examples;
let checkContracts;
let generate;
let screenshot;
let report;
let accept;
let buildSite;
let watchSite;
let initSite;
let buildSvg;

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
  $ rtgl fe build
  $ rtgl fe scaffold -c components -n button
  $ rtgl fe watch -p 3001
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
  .option("--style", "Enable optional naming and signature conventions")
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
      includeStyle: options.style,
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
  .option("-d, --development", "Development mode (no minification)")
  .option(
    "--sourcemap [mode]",
    "Emit source maps; 'hidden' omits the sourceMappingURL comment",
  )
  .addHelpText(
    "after",
    `

Examples:
  $ rtgl fe build
  $ rtgl fe build --sourcemap hidden
  $ rtgl fe build --outfile ./dist/bundle.js
  $ rtgl fe build -o ./public/js/main.js
  $ rtgl fe build --development
  $ rtgl fe build -d -o ./dist/dev.js
  $ rtgl fe build -s src/setup.tauri.js
  $ rtgl fe build --setup-path src/setup.web.js
`,
  )
  .action(async (options) => {
    resolveFeOptions(requireConfig(), process.cwd(), options, { command: "build" });
    await build(options);
  });

feCommand
  .command("check")
  .description("Validate frontend component file contracts")
  .option("--format <format>", "Output format: text or json", "text")
  .addHelpText(
    "after",
    `

Examples:
  $ rtgl fe check
  $ rtgl fe check --format json
`,
  )
  .action((options) => {
    resolveFeOptions(requireConfig(), process.cwd(), options, { command: "check" });
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
  $ rtgl fe scaffold
  $ rtgl fe scaffold --category components --component-name my-button
  $ rtgl fe scaffold -c layouts -n header-layout
  $ rtgl fe scaffold -c pages -n home-page
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
  .option(
    "--public-dir <path>",
    "Directory to serve as untransformed static assets",
  )
  .option(
    "--watch-entry <path>",
    "Project module served at the configured outfile URL in watch mode",
  )
  .addHelpText(
    "after",
    `

Examples:
  $ rtgl fe watch
  $ rtgl fe watch --port 8080
  $ rtgl fe watch -p 4000
  $ rtgl fe watch -s src/setup.tauri.js
  $ rtgl fe watch --setup-path src/setup.web.js
  $ rtgl fe watch --public-dir static
  $ rtgl fe watch --watch-entry src/watch.js
`,
  )
  .action(async (options) => {
    const config = requireConfig();
    resolveFeOptions(config, process.cwd(), options, { command: "watch" });
    if (config.fe.watchVt === true) {
      const [
        { createRettangoliVtWatchPlugin },
        { createViteWatchClientModuleSource },
      ] = await Promise.all([
        import("@rettangoli/vt/cli"),
        import("@rettangoli/sites/watch-client"),
      ]);

      // Generated VT HTML is served by the VT plugin so Vite never observes it
      // as public HTML and cannot turn an in-place morph into a full reload.
      options.publicDir = false;
      options.vitePlugins = [
        ...(options.vitePlugins || []),
        createRettangoliVtWatchPlugin({
          cwd: process.cwd(),
          publicEntryPath: resolveFeServeContext({
            cwd: process.cwd(),
            outfile: options.outfile,
          }).publicEntryPath,
          createWatchClientModuleSource: createViteWatchClientModuleSource,
        }),
      ];
    }

    await watch(options);
  });

feCommand
  .command("examples")
  .description("Generate examples")
  .action((options) => {
    const config = requireConfig();
    if (config.fe === null || typeof config.fe !== "object") {
      throw new CliUserError("fe.dirs not found or empty in config");
    }
    options.dirs = config.fe.dirs;
    options.outputDir = config.fe?.examples?.outputDir || "./vt/specs/examples";
    examples(options);
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
    const config = requireConfig();

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
    const config = requireConfig();

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
  .option("--color-threshold <number>", "Color threshold for pixelmatch (0-1)", parseNumberOption)
  .option("--diff-threshold <number>", "Max diff pixels percentage to pass (0-100)", parseNumberOption)
  .option("--folder <path>", "Compare only screenshots under folder prefix (repeatable)", collectValues, [])
  .option("--group <section-key>", "Compare only one section key from vt.sections (repeatable)", collectValues, [])
  .option("--item <spec-path>", "Compare only one spec path relative to vt/specs (repeatable)", collectValues, [])
  .action(async (options) => {
    const config = requireConfig();

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
    const config = requireConfig();

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
  .option("--host <host>", "Network interface to bind (use 0.0.0.0 for LAN access)", "127.0.0.1")
  .option("-r, --root-dir <path>", "Path to root directory", ".")
  .option("--rootDir <path>", "Deprecated alias for --root-dir")
  .option("-o, --output-path <path>", "Path to destination directory", "./_site")
  .option("--outputPath <path>", "Deprecated alias for --output-path")
  .option("--reload-mode <mode>", "Reload mode: body (state-preserving DOM morph) or full (full-page reload)", "body")
  .option("-q, --quiet", "Suppress non-error logs")
  .action(async (options) => {
    await watchSite({
      port: options.port,
      host: options.host,
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
  $ rtgl ui build-svg
  $ rtgl ui build-svg --dir ./icons --outfile ./dist/icons.js
  $ rtgl ui build-svg -d ./assets/svg -o ./public/js/icons.js
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

async function main() {
  if (requestedCommand === "fe") {
    ({
      build,
      check,
      scaffold,
      watch,
      resolveServeContext: resolveFeServeContext,
      examples,
    } = await import(
      "@rettangoli/fe/cli",
    ));
  } else if (requestedCommand === "check") {
    ({ check: checkContracts } = await import("@rettangoli/check/cli"));
  } else if (requestedCommand === "vt") {
    ({ generate, screenshot, report, accept } = await import("@rettangoli/vt/cli"));
  } else if (requestedCommand === "sites") {
    ({ buildSite, watchSite, initSite } = await import("@rettangoli/sites/cli"));
  } else if (requestedCommand === "ui") {
    ({ buildSvg } = await import("@rettangoli/ui/cli"));
  }

  await program.parseAsync();
}

await runWithErrorBoundary(main);
