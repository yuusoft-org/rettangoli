#!/usr/bin/env node

import { parseJemplForCompiler } from "../src/core/parsers.js";

const CASES = [
  {
    id: "valid-loop",
    input: {
      source: [{ "$for(item, idx in items)": { "rtgl-text": "${item.name}" } }],
      viewText: [
        "template:",
        "  - \"$for(item, idx in items)\":",
        "      rtgl-text: \"${item.name}\"",
      ].join("\n"),
      strictControlDirectives: true,
      fallbackLine: 1,
    },
    assert: (result, failures) => {
      if (result.parseError) {
        failures.push("valid-loop: expected parse success");
      }
      if (!result.typedAst || result.typedAst.kind !== "JemplArrayAst") {
        failures.push("valid-loop: expected typed root kind JemplArrayAst");
      }
      if ((result.controlDiagnostics || []).length !== 0) {
        failures.push("valid-loop: expected zero control diagnostics");
      }
    },
  },
  {
    id: "unknown-directive",
    input: {
      source: [{ "$iff isVisible": { "rtgl-text": "bad" } }],
      viewText: [
        "template:",
        "  - \"$iff isVisible\":",
        "      rtgl-text: bad",
      ].join("\n"),
      strictControlDirectives: true,
      fallbackLine: 1,
    },
    assert: (result, failures) => {
      if (result.parseError) {
        failures.push("unknown-directive: expected parse success");
      }
      const diagnostics = Array.isArray(result.controlDiagnostics) ? result.controlDiagnostics : [];
      if (diagnostics.length !== 1) {
        failures.push(`unknown-directive: expected 1 control diagnostic, got ${diagnostics.length}`);
        return;
      }
      if (!diagnostics[0].message.includes("unknown control keyword")) {
        failures.push("unknown-directive: expected unknown keyword diagnostic");
      }
      if (diagnostics[0].line !== 2) {
        failures.push(`unknown-directive: expected line 2, got ${diagnostics[0].line}`);
      }
    },
  },
  {
    id: "invalid-for-signature",
    input: {
      source: [{ "$for(item in )": { "rtgl-text": "bad" } }],
      viewText: [
        "template:",
        "  - \"$for(item in )\":",
        "      rtgl-text: bad",
      ].join("\n"),
      strictControlDirectives: true,
      fallbackLine: 1,
    },
    assert: (result, failures) => {
      if (result.parseError) {
        failures.push("invalid-for-signature: expected parse success");
      }
      const diagnostics = Array.isArray(result.controlDiagnostics) ? result.controlDiagnostics : [];
      if (diagnostics.length !== 1) {
        failures.push(`invalid-for-signature: expected 1 control diagnostic, got ${diagnostics.length}`);
        return;
      }
      if (!diagnostics[0].message.includes("expected '$for(item[, index] in iterable)' or '$for item[, index] in iterable'")) {
        failures.push("invalid-for-signature: expected strict $for signature diagnostic");
      }
      if (diagnostics[0].line !== 2) {
        failures.push(`invalid-for-signature: expected line 2, got ${diagnostics[0].line}`);
      }
    },
  },
  {
    id: "operator-precedence-typed-ast",
    input: {
      source: [{ "$if count == 0 || !isVisible && hasAccess": { "rtgl-text": "ok" } }],
      strictControlDirectives: true,
      fallbackLine: 1,
    },
    assert: (result, failures) => {
      if (result.parseError) {
        failures.push("operator-precedence-typed-ast: expected parse success");
        return;
      }
      const conditionAst = result?.typedAst?.items?.[0]?.properties?.[0]?.value?.conditions?.[0];
      if (conditionAst?.kind !== "JemplBinaryAst" || conditionAst?.operator !== "||") {
        failures.push("operator-precedence-typed-ast: expected root operator '||'");
        return;
      }
      if (conditionAst?.left?.kind !== "JemplBinaryAst" || conditionAst?.left?.operator !== "==") {
        failures.push("operator-precedence-typed-ast: expected left operator '=='");
      }
      if (conditionAst?.right?.kind !== "JemplBinaryAst" || conditionAst?.right?.operator !== "&&") {
        failures.push("operator-precedence-typed-ast: expected right operator '&&'");
      }
      if (conditionAst?.right?.left?.kind !== "JemplUnaryAst" || conditionAst?.right?.left?.operator !== "!") {
        failures.push("operator-precedence-typed-ast: expected unary not on right-left branch");
      }
    },
  },
  {
    id: "parse-error",
    input: {
      source: [{ "rtgl-text": "Count: ${count + 1}" }],
      strictControlDirectives: true,
      fallbackLine: 9,
    },
    assert: (result, failures) => {
      if (!result.parseError) {
        failures.push("parse-error: expected parseError");
        return;
      }
      if (result.parseError.line !== 9) {
        failures.push(`parse-error: expected fallback line 9, got ${result.parseError.line}`);
      }
      if (!result.parseError.message.includes("Arithmetic expressions not supported")) {
        failures.push("parse-error: expected normalized arithmetic parse message");
      }
      if ((result.controlDiagnostics || []).length !== 0) {
        failures.push("parse-error: expected no control diagnostics on parse failure");
      }
    },
  },
];

const normalized = (value) => JSON.stringify(value);
const failures = [];

CASES.forEach((testCase) => {
  const first = parseJemplForCompiler(testCase.input);
  const second = parseJemplForCompiler(testCase.input);

  if (normalized(first) !== normalized(second)) {
    failures.push(`${testCase.id}: parse result is non-deterministic`);
  }

  testCase.assert(first, failures);
});

if (failures.length > 0) {
  console.error("Jempl parser contract failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Jempl parser contract pass (${CASES.length} case(s)).`);
