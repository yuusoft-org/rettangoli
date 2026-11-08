import { requireConfig } from "../config.js";
import {
  collectValues,
  parseIntegerOption,
  parseIsolationOption,
  parseNumberOption,
} from "../options.js";

export function registerVtCommands(program, { load, version }) {
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
      const { generate } = await load("@rettangoli/vt/cli");
      console.log(`rtgl v${version}`);
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
      const { screenshot } = await load("@rettangoli/vt/cli");
      console.log(`rtgl v${version}`);
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
      const { report } = await load("@rettangoli/vt/cli");
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
      const { accept } = await load("@rettangoli/vt/cli");
      const config = requireConfig();

      const vtPath = config.vt?.path || "vt";
      await accept({ vtPath });
    });
}
