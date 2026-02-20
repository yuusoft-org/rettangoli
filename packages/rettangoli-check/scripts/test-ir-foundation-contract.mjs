#!/usr/bin/env node

import assert from "node:assert/strict";
import { migrateAnalysisToCompilerIr } from "../src/ir/migrate.js";
import { serializeCompilerIr } from "../src/ir/serialize.js";
import { validateCompilerIr } from "../src/ir/validate.js";
import { diffCompilerIr } from "../src/ir/diff.js";
import { IR_COMPATIBILITY_POLICY, IR_VERSION } from "../src/ir/schema.js";

const sampleModels = [
  {
    componentKey: "components/card",
    category: "components",
    component: "card",
    files: {
      view: "src/components/card/card.view.yaml",
      schema: "src/components/card/card.schema.yaml",
      handlers: "src/components/card/card.handlers.js",
    },
    schema: {
      normalized: {
        componentName: "rtgl-test-card",
        props: {
          names: ["title"],
          requiredNames: ["title"],
        },
        events: {
          names: ["tap"],
        },
        methods: {
          names: ["focusInput"],
        },
      },
    },
    handlers: {
      exports: new Set(["handleTap"]),
    },
    store: {
      exports: new Set(["setTitle"]),
    },
    view: {
      yaml: {
        refs: {
          root: {},
        },
      },
    },
    semanticGraph: {
      globalSymbols: new Set(["title", "handleTap"]),
      references: [
        {
          expression: "title",
          context: "attr-prop",
          source: "template-attr",
          line: 4,
          roots: ["title"],
        },
      ],
    },
  },
];

const sampleDiagnostics = [
  {
    code: "RTGL-CHECK-EXPR-001",
    severity: "error",
    message: "sample message",
    filePath: "src/components/card/card.view.yaml",
    line: 4,
  },
];

const ir = migrateAnalysisToCompilerIr({
  models: sampleModels,
  diagnostics: sampleDiagnostics,
  summary: {
    total: 1,
    bySeverity: { error: 1, warn: 0 },
  },
});

assert.equal(ir.version, IR_VERSION, "unexpected IR version");
assert.equal(IR_COMPATIBILITY_POLICY.currentVersion, IR_VERSION, "compatibility policy mismatch");

const validation = validateCompilerIr(ir);
assert.equal(validation.ok, true, `expected valid IR, got ${JSON.stringify(validation.errors)}`);

const firstSerialized = serializeCompilerIr(ir);
const secondSerialized = serializeCompilerIr(ir);
assert.equal(firstSerialized, secondSerialized, "IR serializer must be deterministic");

const mutated = JSON.parse(JSON.stringify(ir));
mutated.typedContract.components[0].props.names.push("subtitle");

const diff = diffCompilerIr({ before: ir, after: mutated });
assert.equal(diff.changed, true, "expected diff to report change");
assert.ok(diff.changes.length > 0, "expected non-empty diff changes");

const invalid = JSON.parse(JSON.stringify(ir));
invalid.semantic.symbols.push({ id: "components/card::global::title", name: "dup" });
const invalidValidation = validateCompilerIr(invalid);
assert.equal(invalidValidation.ok, false, "expected duplicate symbol invariant failure");

console.log("IR foundation contract pass (schema + migrate + validate + serialize + diff).");
