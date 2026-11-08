import { parsePortOption } from "../options.js";

export function registerSitesCommands(program, { load }) {
  const sitesCommand = program.command("sites").description("Rettangoli Sites");

  sitesCommand
    .command("init <project-name>")
    .description("Initialize a new site from template")
    .option("-t, --template <name>", "Template to use", "default")
    .action(async (projectName, options) => {
      const { initSite } = await load("@rettangoli/sites/cli");
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
      const { buildSite } = await load("@rettangoli/sites/cli");
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
      const { watchSite } = await load("@rettangoli/sites/cli");
      await watchSite({
        port: options.port,
        host: options.host,
        rootDir: options.rootDir,
        outputPath: options.outputPath,
        reloadMode: options.reloadMode,
        quiet: !!options.quiet,
      });
    });
}
