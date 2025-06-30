#!/usr/bin/env node

import { build, scaffold, watch, examples } from "rettangoli-fe/cli";
import { generate, report, accept } from "@rettangoli/vt/cli";
import { copyPagesToSite } from "@rettangoli/sites/cli";
import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";

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
    console.error("Error reading config file:", error.message);
    return null;
  }
}


const program = new Command();

program
  .name("rtgl")
  .description("CLI tool for Rettangoli development")
  .version("0.0.1");

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

const feCommand = program.command("fe").description("Frontend framework");

feCommand
  .command("build")
  .description("Build UI components")
  .option("-o, --outfile <path>", "The output file")
  .addHelpText(
    "after",
    `

Examples:
  $ rettangoli fe build
  $ rettangoli fe build --outfile ./dist/bundle.js
  $ rettangoli fe build -o ./public/js/main.js
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
    const missingDirs = config.fe.dirs.filter(dir => !existsSync(resolve(process.cwd(), dir)));
    if (missingDirs.length > 0) {
      throw new Error(`Directories do not exist: ${missingDirs.join(", ")}`);
    }
    
    // Pass dirs, setup, and outfile from config
    options.dirs = config.fe.dirs;
    options.setup = config.fe.setup || 'setup.js';
    
    // Use config outfile if not specified via CLI option
    if (!options.outfile && config.fe.outfile) {
      options.outfile = config.fe.outfile;
    }
    
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
  .option("-p, --port <port>", "The port to use", parseInt, 3001)
  .addHelpText(
    "after",
    `

Examples:
  $ rettangoli fe watch
  $ rettangoli fe watch --port 8080
  $ rettangoli fe watch -p 4000
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
    const missingDirs = config.fe.dirs.filter(dir => !existsSync(resolve(process.cwd(), dir)));
    if (missingDirs.length > 0) {
      throw new Error(`Directories do not exist: ${missingDirs.join(", ")}`);
    }
    
    // Pass dirs and setup from config
    options.dirs = config.fe.dirs;
    options.setup = config.fe.setup || 'setup.js';
    watch(options);
  });


feCommand.command("examples")
  .description("Generate examples")
  .action((options) => {
    const config = readConfig();
    options.dirs = config.fe.dirs;
    options.outputDir = config.fe?.examples?.outputDir || './vt/specs/examples';
    examples(options);
  });



const vtCommand = program
  .command("vt")
  .description("Rettangoli Visual Testing");

vtCommand
  .command("generate")
  .description("Generate visualizations")
  .option("--skip-screenshots", "Skip screenshot generation")
  .option("--screenshot-wait-time <time>", "Wait time between screenshots", "0")
  .action((options) => {
    const config = readConfig();
    
    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }
    
    // Use vt.path from config, default to 'vt'
    options.vizPath = config.vt?.path || 'vt';
    
    generate(options);
  });

vtCommand
  .command("report")
  .description("Create reports")
  .action(() => {
    const config = readConfig();
    
    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }
    
    const vizPath = config.vt?.path || 'vt';
    report({ vizPath });
  });

vtCommand
  .command("accept")
  .description("Accept changes")
  .action(() => {
    const config = readConfig();
    
    if (!config) {
      throw new Error("rettangoli.config.yaml not found");
    }
    
    const vizPath = config.vt?.path || 'vt';
    accept({ vizPath });
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
