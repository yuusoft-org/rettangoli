#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverComponentEntries, groupEntriesByComponent } from "../src/core/discovery.js";
import { buildProjectModel } from "../src/core/model.js";
import { buildMergedRegistry } from "../src/core/registry.js";
import { runSemanticEngine } from "../src/semantic/engine.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const scenariosRoot = path.resolve(currentDir, "../test/scenarios");

const stableStringify = (value) => `${JSON.stringify(value, null, 2)}\n`;

const summarizeSemanticResult = (result = {}) => ({
  globalSymbolRows: result?.globalSymbolTable?.rows || [],
  scopeRows: result?.scopeGraphs?.rows || [],
  resolvedReferences: result?.referenceResolution?.resolvedReferences || [],
  localSymbols: result?.referenceResolution?.localSymbols || [],
  semanticEdges: result?.referenceResolution?.edges || [],
  feRows: result?.feResolution?.rows || [],
  crossComponentRows: result?.crossComponentResolution?.rows || [],
  semanticGraph: result?.semanticGraph || {},
  invariants: result?.invariants || {},
  diagnostics: result?.diagnostics || [],
});

const buildScenarioContext = async (scenarioName) => {
  const cwd = path.join(scenariosRoot, scenarioName);
  const discovery = discoverComponentEntries({
    cwd,
    dirs: ["./src/components"],
  });
  const groups = groupEntriesByComponent(discovery.entries);
  const models = buildProjectModel(groups);
  const registry = await buildMergedRegistry({ models, workspaceRoot: path.resolve(currentDir, "../../..") });

  return {
    cwd,
    models,
    registry,
  };
};

const testDeterminism = async () => {
  const context = await buildScenarioContext("87-expression-nested-loop-shadowing-resolved");
  const first = summarizeSemanticResult(runSemanticEngine({
    models: context.models,
    registry: context.registry,
  }));
  const second = summarizeSemanticResult(runSemanticEngine({
    models: context.models,
    registry: context.registry,
  }));

  assert.equal(
    stableStringify(first),
    stableStringify(second),
    "semantic engine output must be deterministic across repeated runs",
  );
  assert.equal(first.invariants.ok, true, "semantic invariants should pass for stable fixture");
};

const testUnresolvedSymbolDiagnostics = async () => {
  const context = await buildScenarioContext("71-expression-unresolved-template-root");
  const result = runSemanticEngine({ models: context.models, registry: context.registry });
  const unresolved = (result.diagnostics || []).filter((diag) => diag.code === "RTGL-CHECK-SEM-001");
  assert.ok(unresolved.length > 0, "expected unresolved semantic symbol diagnostics");
};

const testAmbiguityAndFeAndCrossComponent = () => {
  const syntheticModel = {
    componentKey: "components/synthetic",
    files: {
      view: "src/components/synthetic/synthetic.view.yaml",
      handlers: "src/components/synthetic/synthetic.handlers.js",
      schema: "src/components/synthetic/synthetic.schema.yaml",
    },
    view: {
      filePath: "src/components/synthetic/synthetic.view.yaml",
      yaml: {
        refs: {
          root: {
            eventListeners: {
              tap: {
                handler: "handleTap",
              },
            },
          },
        },
      },
      refListeners: [
        {
          refKey: "root",
          eventType: "tap",
          eventConfig: { handler: "handleTap" },
          line: 4,
        },
      ],
      templateAst: {
        nodes: [
          {
            tagName: "rtgl-unknown-widget",
            range: { line: 2 },
          },
        ],
      },
    },
    schema: {
      filePath: "src/components/synthetic/synthetic.schema.yaml",
      yaml: {
        methods: {
          properties: {
            focusInput: { type: "function" },
          },
        },
      },
      normalized: {
        props: { names: ["value"] },
      },
    },
    handlers: {
      filePath: "src/components/synthetic/synthetic.handlers.js",
      exports: new Set(["value"]),
    },
    store: {
      filePath: null,
      exports: new Set(),
    },
    methods: {
      filePath: null,
      exports: new Set(),
    },
    constants: {
      filePath: null,
      yaml: {},
    },
    semanticGraph: {
      globalSymbols: new Set(["value"]),
      references: [
        {
          expression: "missingRoot",
          roots: ["missingRoot"],
          context: "template-value",
          source: "jempl-path",
          line: 2,
          localSymbols: new Set(),
        },
      ],
    },
  };

  const result = runSemanticEngine({
    models: [syntheticModel],
    registry: new Map(),
  });

  const ambiguity = result.diagnostics.filter((diag) => diag.code === "RTGL-CHECK-SEM-002");
  const unresolvedFe = result.diagnostics.filter((diag) => diag.code === "RTGL-CHECK-SEM-004");
  const unresolvedXref = result.diagnostics.filter((diag) => diag.code === "RTGL-CHECK-SEM-005");

  assert.ok(ambiguity.length > 0, "expected semantic ambiguity diagnostics");
  assert.ok(unresolvedFe.length > 0, "expected unresolved FE symbol diagnostics");
  assert.ok(unresolvedXref.length > 0, "expected unresolved cross-component diagnostics");
};

await testDeterminism();
await testUnresolvedSymbolDiagnostics();
testAmbiguityAndFeAndCrossComponent();

console.log("Semantic engine contract pass (resolution + diagnostics + invariants + determinism).");
