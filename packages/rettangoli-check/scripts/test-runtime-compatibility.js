import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyzeProject } from "../src/core/analyze.js";
import { parseJemplForCompiler } from "../src/core/parsers.js";

const root = mkdtempSync(path.join(tmpdir(), "rtgl-check-runtime-"));
const write = (relativePath, text) => {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, text);
};
const analyze = (options = {}) => analyzeProject({ cwd: root, dirs: ["src/components"], ...options });
const codes = (result) => result.diagnostics.map((diagnostic) => diagnostic.code);

try {
  for (const source of [
    [{ $each: "item in items", "rtgl-text": "${item.label}" }],
    [{ "$for:nested item in items": [{ "rtgl-text": "${item.label}" }] }],
    [{ "$if#choice visible": [{ "rtgl-text": "Visible" }], "$else#choice": [{ "rtgl-text": "Hidden" }] }],
  ]) {
    const parsed = parseJemplForCompiler({ source, strictControlDirectives: true });
    assert.equal(parsed.parseError, null);
    assert.deepEqual(parsed.controlDiagnostics, [], "runtime-supported Jempl directives must pass strict validation");
  }
  write("src/components/resourceGrid/resourceGrid.schema.yaml", "componentName: demo-resource-grid\n");
  write("src/components/resourceGrid/resourceGrid.handlers.js", `
export const onSelect = () => {};
export const handleBeforeMount = ({ store }) => {};
export const handleOnUpdate = (context) => {};
`);
  write("src/components/resourceGrid/resourceGrid.view.yaml", `
refs:
  choice:
    eventListeners:
      click:
        handler: onSelect
template:
  - $when: true
    rtgl-button#choice: Choose
  - demo-resource-grid w=f: null
styles:
  ':host([w="f"])':
    width: 100%
  '[internal-only]':
    display: none
`);
  const runtime = await analyze();
  assert.deepEqual(runtime.diagnostics, [], "runtime-supported naming, signatures, $when, and host attributes must pass");
  const style = await analyze({ includeStyle: true });
  assert.ok(codes(style).includes("RTGL-CHECK-COMPONENT-001"));
  assert.ok(codes(style).includes("RTGL-CHECK-HANDLER-002"));
  assert.ok(codes(style).includes("RTGL-CHECK-LIFECYCLE-002"));
  assert.ok(codes(style).includes("RTGL-CHECK-LIFECYCLE-003"));

  write("src/components/resourceGrid/resourceGrid.view.yaml", "template:\n  - $when: missingVisibility\n    rtgl-text: Visible\n");
  assert.ok(codes(await analyze({ includeExpression: true })).includes("RTGL-CHECK-EXPR-001"), "$when conditions must retain expression validation");

  write("src/primitives/choice.js", `
throw new Error("Checker must never execute application modules");
export const CHOICE_TAG = "demo-native-choice";
const ATTRS = ["disabled"];
export class Choice extends HTMLElement {
  static get observedAttributes() { return ATTRS; }
  set options(value) { this._options = value; }
  select() { this.dispatchEvent(new CustomEvent("selected")); }
}
`);
  write("src/primitives/register.js", `
import { CHOICE_TAG, Choice } from "./choice.js";
export const register = () => {
  if (!customElements.get(CHOICE_TAG)) customElements.define(CHOICE_TAG, Choice);
};
`);
  write("src/components/resourceGrid/resourceGrid.view.yaml", `
template:
  - demo-native-choice disabled :options=\${options}: null
  - rtgl-form w=f h=f: null
`);
  assert.deepEqual((await analyze()).diagnostics, [], "registered app primitives and UI host attributes should be recognized statically");
  write("src/components/resourceGrid/resourceGrid.view.yaml", `
template:
  - demo-native-choice unsupported=true: null
  - demo-resource-grid internal-only: null
  - rtgl-form unsupported=true: null
  - demo-unregistered: null
`);
  const invalid = await analyze();
  assert.equal(codes(invalid).filter((code) => code === "RTGL-CHECK-YAHTML-003").length, 3);
  assert.equal(codes(invalid).filter((code) => code === "RTGL-CHECK-YAHTML-001").length, 1);

  // Consumer-shaped helper barrels: a handler is re-exported through two files
  // outside the component's discovery directory.
  write("src/components/resourceGrid/resourceGrid.view.yaml", `
refs:
  choice:
    eventListeners:
      click:
        handler: handleSelect
template:
  - rtgl-button#choice: Choose
`);
  write("src/components/resourceGrid/resourceGrid.handlers.js", 'export { handleSelect } from "../../internal/barrel.js";\n');
  write("src/internal/barrel.js", 'export * from "./selection.js";\n');
  write("src/internal/selection.js", "export const handleSelect = () => {};\n");
  const incrementalState = { componentCache: new Map() };
  assert.deepEqual((await analyze({ incrementalState })).diagnostics, []);
  const cacheEntry = [...incrementalState.componentCache.values()][0];
  await analyze({ incrementalState });
  assert.equal([...incrementalState.componentCache.values()][0], cacheEntry, "unchanged dependencies reuse the cached model");

  write("src/internal/selection.js", "export const otherHandler = () => {};\n");
  const removed = await analyze({ incrementalState });
  assert.ok(codes(removed).includes("RTGL-CHECK-SYMBOL-007"));
  assert.ok(codes(removed).includes("RTGL-CHECK-SYMBOL-001"));
  assert.deepEqual(removed.diagnostics, (await analyze()).diagnostics, "transitive edits produce the same diagnostics as a fresh analysis");

  rmSync(path.join(root, "src/internal/selection.js"));
  const missing = await analyze({ incrementalState });
  assert.ok(codes(missing).includes("RTGL-CHECK-SYMBOL-006"));
  assert.deepEqual(missing.diagnostics, (await analyze()).diagnostics);
  write("src/internal/selection.js", "export const handleSelect = () => {};\n");
  assert.deepEqual((await analyze({ incrementalState })).diagnostics, [], "restoring missing transitive exports clears stale diagnostics");

  write("src/internal/barrel.js", 'export * from "./new-selection.js";\n');
  assert.ok(codes(await analyze({ incrementalState })).includes("RTGL-CHECK-SYMBOL-006"));
  write("src/internal/new-selection.js", "export const handleSelect = () => {};\n");
  assert.deepEqual((await analyze({ incrementalState })).diagnostics, [], "creating a previously missing resolution candidate invalidates the model");
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("Runtime compatibility pass (consumer naming, Jempl, host attributes, primitives, transitive watch invalidation).");
