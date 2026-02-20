#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);

const getArg = (flag, fallback = "") => {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
};

const command = getArg("--cmd");
const runs = Number.parseInt(getArg("--runs", "5"), 10);
const compareOutput = getArg("--compare-output", "false") === "true";
const quarantineFile = getArg(
  "--quarantine-file",
  "./packages/rettangoli-check/test/flaky-quarantine.json",
);

if (!command) {
  console.error("Missing required --cmd <shell command>.");
  process.exit(1);
}

const outcomes = [];
for (let index = 0; index < runs; index += 1) {
  const result = spawnSync(command, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
  });
  outcomes.push({
    run: index + 1,
    status: Number.isInteger(result.status) ? result.status : 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  });
}

const stableFingerprint = (outcome) => {
  if (compareOutput) {
    return JSON.stringify({
      status: outcome.status,
      stdout: outcome.stdout,
      stderr: outcome.stderr,
    });
  }
  return JSON.stringify({
    status: outcome.status,
  });
};

const fingerprints = new Set(outcomes.map((outcome) => stableFingerprint(outcome)));
const flaky = fingerprints.size > 1;

const payload = {
  version: 1,
  command,
  runs,
  compareOutput,
  flaky,
  generatedAt: new Date().toISOString(),
  outcomes: outcomes.map((outcome) => ({
    run: outcome.run,
    status: outcome.status,
  })),
};

const resolved = path.resolve(process.cwd(), quarantineFile);
mkdirSync(path.dirname(resolved), { recursive: true });
writeFileSync(resolved, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

if (flaky) {
  console.error(`Flaky behavior detected for command: ${command}`);
  console.error(`Quarantine record written to: ${quarantineFile}`);
  process.exit(1);
}

console.log(`No flaky behavior detected across ${runs} run(s).`);
console.log(`Quarantine record written to: ${quarantineFile}`);
