#!/usr/bin/env node

// UI primitive loading: every primitive of the workspace UI loads, a primitive that fails to
// load keeps its static contract and is reported once (RTGL-CHECK-REGISTRY-001), and the
// browser globals stubbed for the import do not leak.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeProject } from "../src/core/analyze.js";
import { buildUiRegistry, getRegistryLoadFailures } from "../src/core/registry.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const uiPackageDir = path.resolve(currentDir, "../../rettangoli-ui");
const STUBBED_GLOBALS = ["HTMLElement", "CSSStyleSheet", "CustomEvent"];
const globalTypes = () => STUBBED_GLOBALS.map((name) => `${name}:${typeof globalThis[name]}`).join(" ");
const globalsBefore = globalTypes();

// (a) The workspace UI: every primitive registered by registerPrimitives.js and
// entry-iife-layout.js loads.
const definedTags = new Set();
for (const entryName of ["registerPrimitives.js", "entry-iife-layout.js"]) {
  const entryCode = readFileSync(path.join(uiPackageDir, "src", entryName), "utf8");
  for (const match of entryCode.matchAll(/customElements\.define\(\s*["']([a-z][a-z0-9-]*)["']/g)) {
    definedTags.add(match[1]);
  }
}
assert.ok(definedTags.size >= 10, `expected the UI entries to define primitives, found ${definedTags.size}`);

const uiRegistry = await buildUiRegistry({ workspaceRoot: uiPackageDir });
assert.ok(uiRegistry instanceof Map, "buildUiRegistry must return a Map");
definedTags.forEach((tagName) => {
  assert.ok(uiRegistry.has(tagName), `workspace UI primitive '${tagName}' is missing from the registry`);
  assert.ok(uiRegistry.get(tagName).source.has("ui-primitives"), `'${tagName}' must come from ui-primitives`);
});
assert.deepEqual(getRegistryLoadFailures(uiRegistry), [], "every workspace UI primitive must load");

// Two builds at the same time must not remove each other's stubs mid-import.
const [first, second] = await Promise.all([
  buildUiRegistry({ workspaceRoot: uiPackageDir }),
  buildUiRegistry({ workspaceRoot: uiPackageDir }),
]);
assert.deepEqual([...first.keys()], [...uiRegistry.keys()]);
assert.deepEqual([...second.keys()], [...uiRegistry.keys()]);
assert.deepEqual(getRegistryLoadFailures(first), []);
assert.deepEqual(getRegistryLoadFailures(second), []);

// (b) A fake UI: rtgl-bad throws at module scope and is defined by two entries, rtgl-notfn has
// no factory default export, rtgl-good loads.
const sandboxRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "rtgl-ui-load-")));
try {
  const write = (relativePath, contents) => {
    const filePath = path.join(sandboxRoot, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents, "utf8");
  };

  const uiDir = path.join(sandboxRoot, "ui");
  write("ui/package.json", JSON.stringify({ name: "@rettangoli/ui", type: "module", main: "src/index.js" }));
  mkdirSync(path.join(uiDir, "src", "components"), { recursive: true });
  write("ui/src/index.js", "export {};\n");
  const entry = [
    'import Good from "./primitives/good.js";',
    'import Bad from "./primitives/bad.js";',
    'import NotFn from "./primitives/notfn.js";',
    'customElements.define("rtgl-good", Good({}));',
    'customElements.define("rtgl-bad", Bad({}));',
    'customElements.define("rtgl-notfn", NotFn({}));',
    "",
  ].join("\n");
  write("ui/src/entry-iife-ui.js", entry);
  write("ui/src/registerPrimitives.js", entry);
  write(
    "ui/src/primitives/good.js",
    'export default () => class extends HTMLElement { static get observedAttributes() { return ["tone"]; } };\n',
  );
  write(
    "ui/src/primitives/bad.js",
    [
      'const sheet = document.createElement("style");',
      'export default () => class extends HTMLElement { static get observedAttributes() { return ["runtime-only"]; } };',
      'export const styles = `:host([tone="calm"]) { color: blue; }`;',
      "",
    ].join("\n"),
  );
  write("ui/src/primitives/notfn.js", "export default { tone: true };\n");

  const registry = await buildUiRegistry({ workspaceRoot: uiDir });
  assert.ok(registry instanceof Map);
  assert.deepEqual([...registry.get("rtgl-good").attrs], ["tone"]);
  assert.ok(registry.has("rtgl-bad"), "a primitive that fails to load keeps its contract");
  assert.deepEqual([...registry.get("rtgl-bad").attrs], ["tone"], "the failed primitive keeps its static attrs");
  assert.ok(registry.get("rtgl-bad").source.has("ui-primitives"));
  assert.ok(registry.has("rtgl-notfn"));

  const failures = getRegistryLoadFailures(registry);
  assert.deepEqual(
    failures.map(({ tagName, modulePath }) => [tagName, path.relative(uiDir, modulePath)]),
    [["rtgl-bad", "src/primitives/bad.js"], ["rtgl-notfn", "src/primitives/notfn.js"]],
    "one failure per tag, although each tag is defined by two entries",
  );
  assert.match(failures[0].message, /document is not defined/);
  assert.match(failures[1].message, /default export is not a function/);

  write("app/package.json", JSON.stringify({ name: "app", type: "module" }));
  write("app/src/components/page/page.schema.yaml", "componentName: rtgl-app-page\n");
  write(
    "app/src/components/page/page.view.yaml",
    [
      "template:",
      "  - rtgl-good tone=calm: ok",
      "  - rtgl-bad tone=calm: kept",
      "  - rtgl-bad: kept again",
      "  - rtgl-good runtime-only=x: unsupported",
      "  - rtgl-bad runtime-only=x: unknown, not reported",
      "  - rtgl-bad .tone=${tone}: legacy binding",
      "",
    ].join("\n"),
  );
  const result = await analyzeProject({
    cwd: path.join(sandboxRoot, "app"),
    dirs: ["./src/components"],
    workspaceRoot: uiDir,
  });
  const registryDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.code === "RTGL-CHECK-REGISTRY-001");
  assert.deepEqual(
    registryDiagnostics.map(({ severity, filePath, message }) => [severity, path.relative(uiDir, filePath), message]),
    [
      [
        "warn",
        "src/primitives/bad.js",
        "UI primitive 'rtgl-bad' failed to load: document is not defined. Its runtime attributes are unknown, so YAHTML checks for it may be incomplete.",
      ],
      [
        "warn",
        "src/primitives/notfn.js",
        "UI primitive 'rtgl-notfn' failed to load: default export is not a function. Its runtime attributes are unknown, so YAHTML checks for it may be incomplete.",
      ],
    ],
  );
  assert.deepEqual(
    result.diagnostics.filter((diagnostic) => diagnostic.code === "RTGL-CHECK-YAHTML-001"),
    [],
    "a tag whose primitive failed to load is still a known element",
  );
  // A failed tag's runtime-only attributes are unknown: no YAHTML-003 for them. Other tags and
  // YAHTML-002 are unaffected.
  assert.deepEqual(
    result.diagnostics
      .filter((diagnostic) => diagnostic.severity === "error")
      .map(({ code, line, message }) => [code, line, message]),
    [
      ["RTGL-CONTRACT-003", 7, "components/page: legacy property binding syntax is not supported. Use ':prop=${value}' in .view.yaml."],
      ["RTGL-CHECK-YAHTML-003", 5, "components/page: unsupported attr/prop 'runtime-only' on 'rtgl-good'."],
      ["RTGL-CHECK-YAHTML-002", 7, "components/page: legacy '.tone' binding is not supported. Use ':tone'."],
    ],
  );
  assert.equal(result.summary.bySeverity.warn, 2, "REGISTRY-001 is a warning");
} finally {
  rmSync(sandboxRoot, { recursive: true, force: true });
}

// (c) The stubs installed for the imports are removed again.
assert.equal(globalTypes(), globalsBefore, "stubbed browser globals must be restored after the build");
assert.equal(typeof globalThis.HTMLElement, "undefined", "HTMLElement must not leak into Node");

console.log("UI registry load contract pass.");
