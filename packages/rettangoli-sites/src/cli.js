#!/usr/bin/env node

import { Command } from 'commander';
import { copyPagesToSite } from './build.js';
import pkg from '../package.json' assert { type: 'json' };

const { version, name, description } = pkg;
const program = new Command();

program
  .name(name)
  .description(description)
  .version(version);

program
  .command('build')
  .description('Build the site')
  .option('-r, --resources <path>', 'Path to resources directory', './sitic')
  .option('-p, --pages <path>', 'Path to pages directory', './pages')
  .option('-o, --output <path>', 'Path to destination directory', './_site')
  .action(async (options) => {
    console.log('Building site with options:', options);
    await copyPagesToSite({
      resourcesPath: options.resources,
      pagesPath: options.pages,
      outputPath: options.output,
    });
    console.log('Build completed successfully!');
  });

program.parse();
