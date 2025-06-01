import { Command } from 'commander';
import generate from './generate.js';
import accept from './accept.js'; 
import report from './report.js';

const program = new Command();

program
  .version('0.0.1')
  .description('Rettangoli visualization CLI');

program
  .command('generate')
  .description('Generate visualizations')
  .option('--skip-screenshots', 'Skip screenshot generation')
  .option('--screenshot-wait-time <time>', 'Wait time between screenshots', '0')
  .option('--viz-path <path>', 'Path to the viz directory', './viz')
  .action((options) => {
    generate(options);
  });

program
  .command('report')
  .description('Create reports')
  .action(() => {
    report();
  });

program
  .command('accept')
  .description('Accept changes')
  .action(() => {
    accept();
  });

program.parse(process.argv);
