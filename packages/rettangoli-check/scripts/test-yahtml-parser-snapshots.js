#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";
import {
  collectTemplateAstFromView,
  parseYahtmlSelectorKey,
  tokenizeYahtmlSelectorKey,
} from "../src/core/parsers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOT_DIR = path.join(__dirname, "../test/yahtml-parser-snapshots");

const CASES = [
  {
    id: "01-basic-selector-bindings",
    description: "quoted selector key with prop/event/boolean bindings",
    viewText: [
      "template:",
      "  - \"rtgl-button :label=${title} @click=handleTap ?disabled=${isDisabled}\": Tap",
      "",
    ].join("\n"),
  },
  {
    id: "02-explicit-multiline-key",
    description: "explicit multiline key form preserves selector and ranges",
    viewText: [
      "template:",
      "  - ?",
      "      \"rtgl-input#name data-id=input-1 :value=${form.name}\"",
      "    : null",
      "",
    ].join("\n"),
  },
  {
    id: "03-control-flow-nested-selector",
    description: "control flow keys map to child selector element",
    viewText: [
      "template:",
      "  - \"$if isVisible\":",
      "      - \"rtgl-card title=hello\": {}",
      "",
    ].join("\n"),
  },
  {
    id: "04-malformed-attribute-token",
    description: "malformed attribute token emits structured parse diagnostics",
    viewText: [
      "template:",
      "  - \"rtgl-button =${oops} @click=handleTap\": Tap",
      "",
    ].join("\n"),
  },
];

const parseArgs = () => {
  return {
    update: process.argv.includes("--update"),
  };
};

const stableStringify = (value) => `${JSON.stringify(value, null, 2)}\n`;

const stripUndefined = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry));
  }

  if (value && typeof value === "object") {
    const cleaned = {};
    Object.keys(value).forEach((key) => {
      if (value[key] !== undefined) {
        cleaned[key] = stripUndefined(value[key]);
      }
    });
    return cleaned;
  }

  return value;
};

const createLineOffsets = (source = "") => {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      offsets.push(index + 1);
    }
  }
  return offsets;
};

const normalizeSelectorParse = ({ rawKey, line, lineText, lineOffsets }) => {
  const parsed = parseYahtmlSelectorKey({
    rawKey,
    line,
    lineText,
    lineOffsets,
  });

  return {
    ast: parsed.ast,
    cst: parsed.cst,
    diagnostics: parsed.diagnostics,
  };
};

const buildSnapshotPayload = ({ description, viewText }) => {
  const viewYaml = loadYaml(viewText);
  const templateAst = collectTemplateAstFromView({ viewText, viewYaml });
  const lines = viewText.split("\n");
  const lineOffsets = createLineOffsets(viewText);

  const selectorApis = (templateAst.nodes || []).map((node) => {
    const line = Number.isInteger(node?.range?.line) ? node.range.line : 1;
    const lineText = lines[line - 1] || "";

    return {
      rawKey: node.rawKey,
      tokenStream: tokenizeYahtmlSelectorKey(node.rawKey),
      parsedSelector: normalizeSelectorParse({
        rawKey: node.rawKey,
        line,
        lineText,
        lineOffsets,
      }),
    };
  });

  return stripUndefined({
    description,
    templateAst,
    selectorApis,
  });
};

const main = () => {
  const args = parseArgs();
  const failures = [];

  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  CASES.forEach((testCase) => {
    const snapshotPath = path.join(SNAPSHOT_DIR, `${testCase.id}.json`);
    const actualPayload = buildSnapshotPayload(testCase);
    const actualText = stableStringify(actualPayload);

    if (args.update) {
      writeFileSync(snapshotPath, actualText, "utf8");
      return;
    }

    if (!existsSync(snapshotPath)) {
      failures.push(`${testCase.id}: missing snapshot file '${snapshotPath}'`);
      return;
    }

    const expectedText = readFileSync(snapshotPath, "utf8");
    if (expectedText !== actualText) {
      failures.push(`${testCase.id}: snapshot mismatch`);
    }
  });

  if (failures.length > 0) {
    console.error("YAHTML parser snapshot failures:");
    failures.forEach((failure) => {
      console.error(`- ${failure}`);
    });
    console.error("Run with '--update' to regenerate parser snapshots.");
    process.exitCode = 1;
    return;
  }

  if (args.update) {
    console.log(`Updated YAHTML parser snapshots (${CASES.length} case(s)).`);
    return;
  }

  console.log(`YAHTML parser snapshots pass (${CASES.length} case(s)).`);
};

main();
