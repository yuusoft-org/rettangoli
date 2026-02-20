#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyDiagnosticFixes } from "../src/diagnostics/autofix.js";
import { analyzeProject } from "../src/core/analyze.js";
import { formatJsonReport } from "../src/reporters/json.js";
import { formatSarifReport } from "../src/reporters/sarif.js";
import { formatTextReport } from "../src/reporters/text.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const workspaceRoot = path.resolve(packageRoot, "../..");
const scenariosRoot = path.resolve(packageRoot, "test/scenarios");

const runScenario = async (scenarioDirName) => {
  return analyzeProject({
    cwd: path.resolve(scenariosRoot, scenarioDirName),
    dirs: ["./src/components"],
    workspaceRoot,
    includeYahtml: true,
    includeExpression: true,
  });
};

const main = async () => {
  const autofixSourceResult = await runScenario("123-cli-autofix-dry-run-json");
  const legacyBindingDiagnostic = autofixSourceResult.diagnostics.find(
    (diagnostic) => diagnostic.code === "RTGL-CHECK-YAHTML-002",
  );
  assert.ok(legacyBindingDiagnostic, "expected RTGL-CHECK-YAHTML-002 diagnostic");
  assert.ok(legacyBindingDiagnostic.fix, "expected fix metadata for legacy YAHTML binding diagnostic");
  assert.equal(legacyBindingDiagnostic.fix.safe, true, "expected legacy YAHTML autofix to be safe");
  assert.ok(legacyBindingDiagnostic.fix.confidence >= 0.9, "expected high-confidence legacy YAHTML autofix");

  const autofixDryRun = applyDiagnosticFixes({
    diagnostics: autofixSourceResult.diagnostics,
    dryRun: true,
    minConfidence: 0.9,
    includePatchText: true,
  });
  assert.ok(autofixDryRun.candidateCount > 0, "expected at least one autofix candidate");
  assert.ok(autofixDryRun.appliedCount > 0, "expected at least one autofix application in dry-run mode");
  assert.ok(
    autofixDryRun.patches.some((patch) => typeof patch.patch === "string" && patch.patch.includes("@@ -")),
    "expected unified patch output when includePatchText is enabled",
  );

  const resultWithAutofix = {
    ...autofixSourceResult,
    autofix: {
      mode: "dry-run",
      dryRun: true,
      patchOutput: true,
      candidateCount: autofixDryRun.candidateCount,
      appliedCount: autofixDryRun.appliedCount,
      skippedCount: autofixDryRun.skippedCount,
      patches: autofixDryRun.patches,
    },
  };

  const textOutput = formatTextReport({ result: resultWithAutofix, warnAsError: false });
  assert.ok(textOutput.includes("codeframe:"), "expected codeframe in text report");
  assert.ok(textOutput.includes("fix:"), "expected fix hint in text report");
  assert.ok(textOutput.includes("[Autofix]"), "expected autofix summary in text report");
  assert.ok(textOutput.includes("@@ -"), "expected patch text in text report when patch output is enabled");

  const jsonOutput = JSON.parse(formatJsonReport({ result: resultWithAutofix, warnAsError: false }));
  assert.equal(jsonOutput.schemaVersion, 1, "expected diagnostics JSON schemaVersion=1");
  assert.equal(jsonOutput.contractVersion, 1, "expected diagnostics JSON contractVersion=1");
  assert.equal(jsonOutput.reportFormat, "json", "expected diagnostics JSON reportFormat=json");
  assert.ok(Array.isArray(jsonOutput.diagnosticCatalog), "expected diagnostic catalog array");
  const jsonCatalogEntry = jsonOutput.diagnosticCatalog.find(
    (entry) => entry.code === "RTGL-CHECK-YAHTML-002",
  );
  assert.ok(jsonCatalogEntry, "expected catalog entry for RTGL-CHECK-YAHTML-002");
  assert.ok(
    String(jsonCatalogEntry.docsPath || "").includes("#rtgl-check-yahtml-002"),
    "expected docsPath anchor for RTGL-CHECK-YAHTML-002",
  );
  assert.equal(jsonCatalogEntry.namespaceValid, true, "expected valid namespace for RTGL-CHECK-YAHTML-002");
  assert.equal(jsonOutput.autofix?.patchOutput, true, "expected json autofix patchOutput metadata");

  const relatedSourceResult = await runScenario("68-cross-file-symbol-reexport-missing-target");
  const sarifOutput = JSON.parse(formatSarifReport({ result: relatedSourceResult }));
  assert.equal(sarifOutput.version, "2.1.0", "expected SARIF version 2.1.0");
  assert.ok(Array.isArray(sarifOutput.runs) && sarifOutput.runs.length === 1, "expected one SARIF run");
  const sarifRun = sarifOutput.runs[0];
  assert.ok(Array.isArray(sarifRun.tool?.driver?.rules), "expected SARIF rule metadata");
  assert.ok(
    sarifRun.tool.driver.rules.some((rule) => typeof rule.helpUri === "string" && rule.helpUri.includes("diagnostics-reference.md")),
    "expected SARIF rules to include diagnostics docs links",
  );
  assert.ok(Array.isArray(sarifRun.results) && sarifRun.results.length > 0, "expected SARIF results");
  assert.ok(
    sarifRun.results.some((result) => Array.isArray(result.relatedLocations) && result.relatedLocations.length > 0),
    "expected related locations in SARIF results",
  );
  assert.ok(
    sarifRun.results.some((result) => Array.isArray(result.codeFlows) && result.codeFlows.length > 0),
    "expected code flow traces in SARIF results",
  );
  assert.ok(
    sarifRun.results.every((result) => typeof result.partialFingerprints?.primaryLocationLineHash === "string"),
    "expected stable SARIF result fingerprints",
  );

  console.log("Diagnostics reporting contract pass (catalog + text/json/sarif + autofix patch invariants).");
};

await main();
