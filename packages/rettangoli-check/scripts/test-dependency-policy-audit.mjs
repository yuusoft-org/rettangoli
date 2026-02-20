#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const packagesRoot = path.join(repoRoot, "packages");
const policyDocPath = path.join(packageRoot, "docs/dependency-update-policy-and-audit.md");

const collectPackageJsonFiles = (rootDir) => {
  const files = [];
  const entries = readdirSync(rootDir);
  entries.forEach((entry) => {
    const fullPath = path.join(rootDir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      const packageJsonPath = path.join(fullPath, "package.json");
      if (existsSync(packageJsonPath)) {
        files.push(packageJsonPath);
      }
    }
  });
  return files.sort((left, right) => left.localeCompare(right));
};

const findForbiddenDependencyVersions = ({ packageJsonPath }) => {
  const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const fields = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
  const violations = [];

  fields.forEach((field) => {
    const deps = parsed[field];
    if (!deps || typeof deps !== "object") {
      return;
    }
    Object.entries(deps).forEach(([name, version]) => {
      const normalized = String(version || "").trim();
      if (!normalized) {
        violations.push(`${packageJsonPath}: '${name}' has empty version in ${field}`);
        return;
      }
      if (normalized === "*" || normalized.toLowerCase() === "latest") {
        violations.push(`${packageJsonPath}: '${name}' uses forbidden version '${normalized}' in ${field}`);
      }
    });
  });

  return violations;
};

const main = async () => {
  assert.equal(existsSync(path.join(repoRoot, "bun.lock")), true, "expected bun.lock at repository root");
  assert.equal(existsSync(policyDocPath), true, "expected dependency policy doc");

  const packageJsonFiles = collectPackageJsonFiles(packagesRoot);
  const violations = packageJsonFiles.flatMap((packageJsonPath) => (
    findForbiddenDependencyVersions({ packageJsonPath })
  ));

  assert.equal(violations.length, 0, `dependency policy violations:\n${violations.join("\n")}`);
  console.log(`Dependency policy audit pass (${packageJsonFiles.length} package manifests checked).`);
};

await main();
