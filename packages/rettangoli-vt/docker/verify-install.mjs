import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const [entry, expectedCli, expectedVt, expectedPlaywright] = process.argv.slice(2);
const cliPath = resolve(entry);
const requireCli = createRequire(cliPath);
const cli = JSON.parse(readFileSync(join(dirname(cliPath), 'package.json'), 'utf8'));
const vtEntry = requireCli.resolve('@rettangoli/vt');
const vt = JSON.parse(readFileSync(join(dirname(vtEntry), '../package.json'), 'utf8'));
const requireVt = createRequire(vtEntry);
const playwright = requireVt('playwright/package.json');

assert.equal(vt.version, cli.dependencies['@rettangoli/vt'], 'Installed VT must match the CLI manifest');
assert.equal(playwright.version, vt.dependencies.playwright, 'Installed Playwright must match the VT manifest');
if (expectedCli) assert.equal(cli.version, expectedCli, 'Unexpected CLI release');
if (expectedVt) assert.equal(vt.version, expectedVt, 'Unexpected VT release');
if (expectedPlaywright) assert.equal(playwright.version, expectedPlaywright, 'Browser image must match Playwright');
console.log(`rtgl ${cli.version}; @rettangoli/vt ${vt.version}; Playwright ${playwright.version}`);
