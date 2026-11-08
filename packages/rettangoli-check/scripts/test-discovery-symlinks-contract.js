#!/usr/bin/env node

// Component discovery over symlinks: a dangling link and a link loop are skipped instead of
// failing the whole run, and symlinked component directories are still checked (as before,
// two links to one directory, or overlapping --dir roots, check it once per path).

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyzeProject } from "../src/core/analyze.js";
import { walkFiles } from "../src/utils/fs.js";

const sandboxRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "rtgl-discovery-symlinks-")));
const write = (relativePath, contents) => {
  const filePath = path.join(sandboxRoot, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, "utf8");
};
const link = (target, relativePath) => {
  const linkPath = path.join(sandboxRoot, relativePath);
  mkdirSync(path.dirname(linkPath), { recursive: true });
  symlinkSync(target, linkPath);
};
const writeComponent = (dir, name) => {
  write(`${dir}/${name}/${name}.schema.yaml`, `componentName: rtgl-symlink-${name}\n`);
  write(`${dir}/${name}/${name}.view.yaml`, "template:\n  - rtgl-text: Hello\n  - rtgl-unknown-x: missing\n");
};
const relative = (filePath) => path.relative(sandboxRoot, filePath);
// Sorted: components are emitted in directory-read order, which differs between filesystems.
const summarize = (result) => result.diagnostics.map(
  (diagnostic) => `${diagnostic.code} ${relative(diagnostic.filePath)}:${diagnostic.line} ${diagnostic.message}`,
).sort();

// The output for card and the two badge links, measured before the symlink fix (without the
// dangling link and the loops, which made that version fail), sorted.
const EXPECTED_DIAGNOSTICS = [
  "RTGL-CHECK-COMPONENT-002 src/components/badge-alias/badge.schema.yaml:1 components/badge-alias: file 'badge.schema.yaml' does not match component identity 'components/badge-alias'. Expected basename 'badge-alias' before '.schema.yaml'.",
  "RTGL-CHECK-COMPONENT-002 src/components/badge-alias/badge.view.yaml:1 components/badge-alias: file 'badge.view.yaml' does not match component identity 'components/badge-alias'. Expected basename 'badge-alias' before '.view.yaml'.",
  "RTGL-CHECK-SCHEMA-008 src/components/badge/badge.schema.yaml:1 Duplicate componentName 'rtgl-symlink-badge' found in multiple schema files.",
  "RTGL-CHECK-SCHEMA-008 src/components/badge-alias/badge.schema.yaml:1 Duplicate componentName 'rtgl-symlink-badge' found in multiple schema files.",
  "RTGL-CHECK-YAHTML-001 src/components/badge/badge.view.yaml:3 components/badge: unknown custom element 'rtgl-unknown-x' in view template.",
  "RTGL-CHECK-YAHTML-001 src/components/badge-alias/badge.view.yaml:3 components/badge-alias: unknown custom element 'rtgl-unknown-x' in view template.",
  "RTGL-CHECK-YAHTML-001 src/components/card/card.view.yaml:3 components/card: unknown custom element 'rtgl-unknown-x' in view template.",
].sort();

try {
  writeComponent("src/components", "card");
  writeComponent("shared", "badge");
  // Two links to one component directory outside the scanned root.
  link("../../shared/badge", "src/components/badge");
  link("../../shared/badge", "src/components/badge-alias");
  // A dangling component file, a loop back to an ancestor and a self-referencing link (ELOOP).
  link("./missing.view.yaml", "src/components/card/ghost.view.yaml");
  link("..", "src/components/card/loop");
  link("self", "src/components/self");

  const files = walkFiles([path.join(sandboxRoot, "src/components")]).map(relative).sort();
  assert.deepEqual(files, [
    "src/components/badge-alias/badge.schema.yaml",
    "src/components/badge-alias/badge.view.yaml",
    "src/components/badge/badge.schema.yaml",
    "src/components/badge/badge.view.yaml",
    "src/components/card/card.schema.yaml",
    "src/components/card/card.view.yaml",
  ]);

  // From the inner root, 'loop' points above the root: also a loop, so it is not walked.
  assert.deepEqual(walkFiles([path.join(sandboxRoot, "src/components/card")]).map(relative).sort(), [
    "src/components/card/card.schema.yaml",
    "src/components/card/card.view.yaml",
  ]);

  const result = await analyzeProject({ cwd: sandboxRoot, dirs: ["./src/components"] });
  assert.equal(result.componentCount, 3, "card, and badge through each of its two links");
  assert.deepEqual(summarize(result), EXPECTED_DIAGNOSTICS);

  // Overlapping roots give the same output.
  const overlapping = await analyzeProject({
    cwd: sandboxRoot,
    dirs: ["./src/components", "./src/components/card"],
  });
  assert.equal(overlapping.componentCount, 3);
  assert.deepEqual(summarize(overlapping), EXPECTED_DIAGNOSTICS);
} finally {
  rmSync(sandboxRoot, { recursive: true, force: true });
}

console.log("Discovery symlinks contract pass.");
