#!/usr/bin/env node

import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  parseJemplForCompiler,
  parseYahtmlSelectorKey,
  parseYamlSafe,
} from "../src/core/parsers.js";

const TIME_BUDGET_MS = Number.parseInt(process.env.RTGL_PARSER_SCAN_BUDGET_MS || "", 10) || 2000;

const YAHTML_CASES = [
  "rtgl-input .value=${title}: null",
  "rtgl-input [".repeat(200),
  "rtgl-button @click=${handleClick}: null",
  "rtgl-input .value=${'x'.repeat(1000)}: null",
];

const JEMPL_CASES = [
  "{{ if user }}hello{{ /if }}",
  "{{ for item in list }}{{ item.name }}{{ /for }}",
  "{{ ".repeat(400),
  "{{ if (a && b) || c }}{{ unknown.path }}{{ /if }}",
];

const YAML_CASES = [
  "componentName: rtgl-parser-scan",
  "template:\n  - rtgl-input .value=${title}: null\nstyles: {}",
  "a: [".repeat(200),
  "schema:\n  props:\n    type: object\n    properties:\n      title:\n        type: string\n",
];

const main = async () => {
  const started = performance.now();
  const failures = [];

  YAHTML_CASES.forEach((keyText, index) => {
    try {
      parseYahtmlSelectorKey({
        componentKey: "components/security",
        filePath: `yahtml-${index}.view.yaml`,
        line: index + 1,
        keyText,
      });
    } catch (err) {
      failures.push(`YAHTML case ${index} threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  JEMPL_CASES.forEach((source, index) => {
    try {
      parseJemplForCompiler({
        source,
        filePath: `jempl-${index}.view.yaml`,
      });
    } catch (err) {
      failures.push(`Jempl case ${index} threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  YAML_CASES.forEach((text, index) => {
    try {
      parseYamlSafe({
        text,
        filePath: `yaml-${index}.yaml`,
      });
    } catch (err) {
      failures.push(`YAML case ${index} threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  const elapsedMs = Number((performance.now() - started).toFixed(2));
  assert.equal(failures.length, 0, `parser security scan encountered failures:\n${failures.join("\n")}`);
  assert.ok(elapsedMs <= TIME_BUDGET_MS, `parser security scan exceeded time budget ${TIME_BUDGET_MS}ms (actual ${elapsedMs}ms)`);

  console.log(`Parser security scan pass (cases=${YAHTML_CASES.length + JEMPL_CASES.length + YAML_CASES.length}, elapsed=${elapsedMs}ms).`);
};

await main();
