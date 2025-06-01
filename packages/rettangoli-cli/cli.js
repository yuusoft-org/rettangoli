import { build, scaffold, watch } from "rettangoli-fe/cli";
import { generate, report, accept } from "rettangoli-vt/cli";
import { copyPagesToSite } from "rettangoli-sites/cli";
import { Command } from "commander";

const program = new Command();

program
  .name("rettangoli")
  .description("CLI tool for rettangoli development")
  .version("1.0.0");

// Add examples to main program
program.addHelpText(
  "after",
  `

Examples:
  $ rettangoli fe build
  $ rettangoli fe scaffold -c components -n Button
  $ rettangoli fe watch -d ./src -d ./components -p 3001
`,
);

const feCommand = program.command("fe").description("Frontend framework");

feCommand
  .command("build")
  .description("Build UI components")
  .option("-d, --dirs <dirs...>", "The directories to build", ["./example"])
  .option("-o, --outfile <path>", "The output file", "./viz/static/main.js")
  .addHelpText(
    "after",
    `

Examples:
  $ rettangoli fe build
  $ rettangoli fe build --base ./my-project --outfile ./dist/bundle.js
  $ rettangoli fe build -b ./src -o ./public/js/main.js
`,
  )
  .action((options) => {
    build(options);
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
  .option("-d, --dirs <dirs...>", "The directories to watch", ["./example"])
  .option("-p, --port <port>", "The port to use", parseInt, 3001)
  .addHelpText(
    "after",
    `

Examples:
  $ rettangoli fe watch
  $ rettangoli fe watch --port 8080
  $ rettangoli fe watch --dirs ./src ./components ./pages
  $ rettangoli fe watch -d ./src -d ./lib -p 4000
`,
  )
  .action((options) => {
    watch(options);
  });

const vtCommand = program
  .command("vt")
  .description("Rettangoli Visual Testing");

vtCommand
  .command("generate")
  .description("Generate visualizations")
  .option("--skip-screenshots", "Skip screenshot generation")
  .option("--screenshot-wait-time <time>", "Wait time between screenshots", "0")
  .option("--viz-path <path>", "Path to the viz directory", "./viz")
  .action((options) => {
    generate(options);
  });

vtCommand
  .command("report")
  .description("Create reports")
  .action(() => {
    report();
  });

vtCommand
  .command("accept")
  .description("Accept changes")
  .action(() => {
    accept();
  });

const sitesCommand = program.command("sites").description("Rettangoli Sites");

sitesCommand
  .command("build")
  .description("Build the site")
  .option("-r, --resources <path>", "Path to resources directory", "./sitic")
  .option("-p, --pages <path>", "Path to pages directory", "./pages")
  .option("-o, --output <path>", "Path to destination directory", "./_site")
  .action(async (options) => {
    console.log("Building site with options:", options);
    await copyPagesToSite({
      resourcesPath: options.resources,
      pagesPath: options.pages,
      outputPath: options.output,
    });
    console.log("Build completed successfully!");
  });

program.parse();
