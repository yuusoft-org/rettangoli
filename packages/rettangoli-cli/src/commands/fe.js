import { requireConfig } from "../config.js";
import { resolveFeOptions } from "../fe-config.js";
import { parsePortOption } from "../options.js";
import { warnFeSkew } from "../package-resolution.js";

export function registerFeCommands(program, { load, version }) {
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
      const { build } = await load("@rettangoli/fe/cli");
      resolveFeOptions(requireConfig(), process.cwd(), options, { command: "build" });
      warnFeSkew({ cwd: process.cwd(), command: "build", rtglVersion: version });
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
    .action(async (options) => {
      const { check } = await load("@rettangoli/fe/cli");
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
    .action(async (options) => {
      const { scaffold } = await load("@rettangoli/fe/cli");
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
      const { watch, resolveServeContext } = await load("@rettangoli/fe/cli");
      const config = requireConfig();
      resolveFeOptions(config, process.cwd(), options, { command: "watch" });
      warnFeSkew({ cwd: process.cwd(), command: "watch", rtglVersion: version });
      if (config.fe.watchVt === true) {
        const [
          { createRettangoliVtWatchPlugin },
          { createViteWatchClientModuleSource },
        ] = await Promise.all([
          load("@rettangoli/vt/cli"),
          load("@rettangoli/sites/watch-client"),
        ]);

        // Generated VT HTML is served by the VT plugin so Vite never observes it
        // as public HTML and cannot turn an in-place morph into a full reload.
        options.publicDir = false;
        options.vitePlugins = [
          ...(options.vitePlugins || []),
          createRettangoliVtWatchPlugin({
            cwd: process.cwd(),
            publicEntryPath: resolveServeContext({
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
    .action(async (options) => {
      const { examples } = await load("@rettangoli/fe/cli");
      const config = requireConfig();
      // An empty fe.dirs list generates nothing, as it always has. Anything else is
      // validated like fe check ("check" validates only fe.dirs, which is all examples reads).
      const dirs = config.fe?.dirs;
      options.dirs = Array.isArray(dirs) && dirs.length === 0
        ? dirs
        : resolveFeOptions(config, process.cwd(), {}, { command: "check" }).dirs;
      options.outputDir = config.fe?.examples?.outputDir || "./vt/specs/examples";
      examples(options);
    });
}
