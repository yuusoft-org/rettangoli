#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverComponentEntries, groupEntriesByComponent } from "../src/core/discovery.js";
import { buildComponentModel } from "../src/core/model.js";
import { runCrossFileSymbolRules } from "../src/rules/crossFileSymbols.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const scenarioRoot = path.resolve(
  currentDir,
  "../test/scenarios/46-handlers-export-prefix",
);

const discovery = discoverComponentEntries({
  cwd: scenarioRoot,
  dirs: ["./src/components"],
});
const groups = groupEntriesByComponent(discovery.entries);

assert.equal(groups.length, 1, "expected exactly one component group in fixture");

const model = buildComponentModel(groups[0]);
const frontendHandlerDiagnostics = model.diagnostics.filter(
  (diag) => diag.code === "RTGL-CHECK-HANDLER-002",
);

assert.equal(
  frontendHandlerDiagnostics.length,
  1,
  "expected frontend model pass to emit one handler-prefix diagnostic",
);
assert.match(
  frontendHandlerDiagnostics[0].message,
  /invalid handler export 'onTap'/,
  "unexpected frontend handler diagnostic message",
);

const ruleDiagnostics = runCrossFileSymbolRules({ models: [model] });
const ruleHandlerDiagnostics = ruleDiagnostics.filter(
  (diag) => diag.code === "RTGL-CHECK-HANDLER-002",
);
assert.equal(
  ruleHandlerDiagnostics.length,
  0,
  "cross-file rule pass should not duplicate frontend handler-prefix diagnostics",
);

console.log("FE frontend handler contract pass (frontend-only handler naming diagnostics).");
