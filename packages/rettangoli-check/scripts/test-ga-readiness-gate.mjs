#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");

const REQUIRED_DOCS = [
  "docs/disaster-rollback-playbook.md",
  "docs/ga-readiness-runbook.md",
  "docs/support-slo-model.md",
  "docs/release-train-hotfix-protocol.md",
  "docs/dependency-update-policy-and-audit.md",
  "docs/release-signing-provenance-contract.md",
];

const GATE_COMMANDS = [
  "node ./scripts/test-diagnostics-reporting-contract.mjs",
  "node ./scripts/test-lsp-contract.mjs",
  "node ./scripts/test-lsp-performance-sla.mjs",
  "node ./scripts/test-incremental-graph-contract.mjs",
  "node ./scripts/test-performance-gates.mjs",
  "node ./scripts/test-parser-security-scan.mjs",
  "node ./scripts/test-adversarial-inputs.mjs",
  "node ./scripts/test-release-provenance-gate.mjs",
  "node ./scripts/test-dependency-policy-audit.mjs",
];

const runCommand = (command) => {
  const result = spawnSync(command, {
    cwd: packageRoot,
    shell: true,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error([
      `Command failed: ${command}`,
      result.stdout || "",
      result.stderr || "",
    ].join("\n"));
  }
};

const main = async () => {
  REQUIRED_DOCS.forEach((relativeDocPath) => {
    const absoluteDocPath = path.join(packageRoot, relativeDocPath);
    assert.equal(existsSync(absoluteDocPath), true, `missing required GA doc: ${relativeDocPath}`);
  });

  GATE_COMMANDS.forEach((command) => runCommand(command));
  console.log("GA readiness gate pass (docs + execution gates).");
};

await main();
