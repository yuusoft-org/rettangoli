import { Command } from "commander";
import { readFileSync } from "fs";
import { registerFeCommands } from "./commands/fe.js";
import { registerSitesCommands } from "./commands/sites.js";
import { registerVtCommands } from "./commands/vt.js";
import { readConfig } from "./config.js";
import { runWithErrorBoundary } from "./errors.js";
import { collectValues, parseIntegerOption } from "./options.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url)),
);

// Builds the rtgl command tree. `load(specifier)` imports a @rettangoli/*
// package entry point (cli.js passes `import`; tests pass fakes).
export function createProgram({ load }) {
  const context = { load, version: packageJson.version };
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
      const { check } = await load("@rettangoli/check/cli");
      await check({
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

  registerFeCommands(program, context);
  registerVtCommands(program, context);
  registerSitesCommands(program, context);

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
    .action(async (options) => {
      const { buildSvg } = await load("@rettangoli/ui/cli");
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

  return program;
}

// Commands whose package is imported before the arguments are parsed, so
// `rtgl fe --help` still fails when @rettangoli/fe cannot be loaded.
const PRELOADED_COMMANDS = ["fe", "check", "vt", "sites", "ui"];

export async function runCli({ load }) {
  await runWithErrorBoundary(async () => {
    const requestedCommand = process.argv[2];
    if (PRELOADED_COMMANDS.includes(requestedCommand)) {
      await load(`@rettangoli/${requestedCommand}/cli`);
    }

    await createProgram({ load }).parseAsync();
  });
}
