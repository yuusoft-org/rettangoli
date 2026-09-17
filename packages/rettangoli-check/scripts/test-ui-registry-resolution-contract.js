#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildUiRegistry,
  resolveUiSourceDir,
} from "../src/core/registry.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const uiPackageDir = path.resolve(currentDir, "../../rettangoli-ui");
const sandboxRoot = mkdtempSync(path.join(tmpdir(), "rtgl-ui-registry-"));

try {
  const decoyUiDir = path.join(sandboxRoot, "packages", "rettangoli-ui");
  mkdirSync(decoyUiDir, { recursive: true });
  writeFileSync(path.join(decoyUiDir, "README.md"), "not a UI source package\n", "utf8");

  assert.equal(
    resolveUiSourceDir({ workspaceRoot: uiPackageDir }),
    uiPackageDir,
    "the UI package root should be recognized when the checker runs from that package",
  );
  assert.notEqual(
    resolveUiSourceDir({ workspaceRoot: sandboxRoot }),
    decoyUiDir,
    "an unrelated or incomplete packages/rettangoli-ui directory must not shadow the real registry source",
  );

  for (const workspaceRoot of [uiPackageDir, sandboxRoot]) {
    const registry = await buildUiRegistry({ workspaceRoot });
    assert.ok(registry.has("rtgl-form"), "UI schema components should be registered");
    assert.ok(registry.has("rtgl-view"), "UI primitives should be registered");
    assert.ok(
      registry.has("rtgl-checkbox"),
      "primitives registered through the shared production module should be registered",
    );
    assert.ok(registry.get("rtgl-form").attrs.has("w"), "component host style attributes should be registered");
    assert.ok(registry.get("rtgl-form").attrs.has("h"), "component host style height should be registered");
  }

  const installedUiDir = path.join(sandboxRoot, "node_modules", "@rettangoli", "ui");
  mkdirSync(path.join(installedUiDir, "src", "components"), { recursive: true });
  writeFileSync(path.join(installedUiDir, "package.json"), JSON.stringify({ name: "@rettangoli/ui", main: "src/index.js" }));
  writeFileSync(path.join(installedUiDir, "src", "index.js"), "export {};\n");
  writeFileSync(path.join(installedUiDir, "src", "entry-iife-ui.js"), "export {};\n");
  assert.equal(resolveUiSourceDir({ workspaceRoot: sandboxRoot }), installedUiDir,
    "the consumer's installed UI version must take precedence over the checker's workspace fallback");
} finally {
  rmSync(sandboxRoot, { recursive: true, force: true });
}

console.log("UI registry resolution contract pass (package root + invalid candidate fallback).");
