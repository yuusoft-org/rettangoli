#!/usr/bin/env node
import build from '../../../src/cli/build.js';
import check from '../../../src/cli/check.js';
import db from '../../../src/cli/db.js';
import manifest from '../../../src/cli/manifest.js';
import resume from '../../../src/cli/resume.js';
import scaffold from '../../../src/cli/scaffold.js';
import test from '../../../src/cli/test.js';
import verify from '../../../src/cli/verify.js';

const command = process.argv[2];
const args = process.argv.slice(3);

const getOptionValue = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
};

const hasFlag = (name) => args.includes(name);

const options = {
  method: getOptionValue('--method'),
  format: hasFlag('--json') ? 'json' : getOptionValue('--format'),
  packageManager: getOptionValue('--package-manager'),
  executable: getOptionValue('--runner'),
  dryRun: hasFlag('--dry-run'),
  methodId: getOptionValue('--method-id') || (command === 'scaffold' && args[0] === 'method' ? args[1] : undefined),
  taskId: getOptionValue('--task') || getOptionValue('--task-id'),
  evidence: getOptionValue('--evidence'),
};

if (command === 'build') {
  build(options);
} else if (command === 'check') {
  check(options);
} else if (command === 'db') {
  db(options);
} else if (command === 'manifest') {
  manifest(options);
} else if (command === 'resume') {
  resume(options);
} else if (command === 'scaffold') {
  scaffold(options);
} else if (command === 'test') {
  test(options);
} else if (command === 'verify') {
  verify(options);
} else {
  console.error(`Unknown example be command: ${command || '<missing>'}`);
  process.exitCode = 1;
}
