#!/usr/bin/env node
import build from '../../../src/cli/build.js';
import check from '../../../src/cli/check.js';
import manifest from '../../../src/cli/manifest.js';
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
};

if (command === 'build') {
  build();
} else if (command === 'check') {
  check(options);
} else if (command === 'manifest') {
  manifest(options);
} else if (command === 'test') {
  test(options);
} else if (command === 'verify') {
  verify(options);
} else {
  console.error(`Unknown example be command: ${command || '<missing>'}`);
  process.exitCode = 1;
}
