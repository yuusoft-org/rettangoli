#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildUiRegistry } from "../src/core/registry.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const uiPackageDir = path.resolve(currentDir, "../../rettangoli-ui");

// Real UI package: rtgl-view and rtgl-grid receive `sbv` from the shared
// overlay scrollbar styles they import, without leaking it elsewhere.
const uiRegistry = await buildUiRegistry({ workspaceRoot: uiPackageDir });
for (const tagName of ["rtgl-view", "rtgl-grid"]) {
  assert.ok(
    uiRegistry.get(tagName).attrs.has("sbv"),
    `${tagName} should accept sbv from the imported overlay scrollbar styles`,
  );
}
assert.ok(uiRegistry.get("rtgl-popover").attrs.has("content-sbv"));
for (const tagName of ["rtgl-text", "rtgl-input", "rtgl-button"]) {
  const attrs = uiRegistry.get(tagName).attrs;
  assert.ok(!attrs.has("sbv"), `${tagName} must not inherit sbv`);
}
assert.ok(
  !uiRegistry.get("rtgl-input").attrs.has("href"),
  "helpers imported from a shared module must not pull in its unrelated selectors",
);

// Synthetic UI package covering composed constants, unrelated exports,
// helper imports, and imports of other primitive modules.
const sandboxRoot = mkdtempSync(path.join(tmpdir(), "rtgl-ui-imported-attrs-"));
try {
  const write = (relativePath, contents) => {
    const filePath = path.join(sandboxRoot, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents, "utf8");
  };

  write("package.json", JSON.stringify({ name: "@rettangoli/ui", type: "module", main: "src/index.js" }));
  mkdirSync(path.join(sandboxRoot, "src", "components"), { recursive: true });
  write("src/index.js", "export {};\n");
  write(
    "src/entry-iife-ui.js",
    [
      'import Probe from "./primitives/probe.js";',
      'import Other from "./primitives/other.js";',
      'customElements.define("x-probe", Probe({}));',
      'customElements.define("x-other", Other({}));',
      "",
    ].join("\n"),
  );
  write(
    "src/shared/styles.js",
    [
      "const deepStyles = `:host([deep-attr]) { color: red; }`;",
      'export const sharedStyles = `:host([shared-attr="on"]) { opacity: 1; } ${deepStyles}`;',
      "export const unrelatedStyles = `:host([unrelated-attr]) { opacity: 0; }`;",
      'export const helper = () => "helper";',
      "",
    ].join("\n"),
  );
  write(
    "src/primitives/other.js",
    [
      "export const otherStyles = `:host([other-only]) { opacity: 0; }`;",
      "export default () => class Other extends HTMLElement {};",
      "",
    ].join("\n"),
  );
  write(
    "src/primitives/probe.js",
    [
      'import { sharedStyles, helper } from "../shared/styles.js";',
      'import { otherStyles } from "./other.js";',
      "export default () => class Probe extends HTMLElement {",
      '  static get observedAttributes() { return ["own-attr"]; }',
      "};",
      "",
    ].join("\n"),
  );

  const registry = await buildUiRegistry({ workspaceRoot: sandboxRoot });
  const probeAttrs = registry.get("x-probe")?.attrs;
  assert.ok(probeAttrs, "the fixture primitive should be registered");
  assert.ok(probeAttrs.has("own-attr"), "observed attributes stay registered");
  assert.ok(probeAttrs.has("shared-attr"), "host selectors from imported style exports are registered");
  assert.ok(probeAttrs.has("deep-attr"), "same-module constants interpolated into an imported export are followed");
  assert.ok(!probeAttrs.has("unrelated-attr"), "exports that are not imported are ignored");
  assert.ok(!probeAttrs.has("other-only"), "imports of other primitive modules are ignored");
} finally {
  rmSync(sandboxRoot, { recursive: true, force: true });
}

console.log("UI primitive imported host attribute contract pass (shared style exports, no leakage).");
