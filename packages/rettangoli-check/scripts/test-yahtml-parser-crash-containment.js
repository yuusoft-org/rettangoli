#!/usr/bin/env node

import { load as loadYaml } from "js-yaml";
import {
  collectTemplateAstFromView,
  parseYahtmlSelectorKey,
} from "../src/core/parsers.js";

const SELECTOR_CASES = [
  "",
  "   ",
  "rtgl-button",
  "rtgl-button =${oops}",
  "rtgl-button :label='unterminated",
  "rtgl-button \"double-quote",
  "rtgl-button @click=",
  "$if isVisible",
  ":bad-start",
  "rtgl-button {{{",
  "rtgl-input ?disabled",
  "rtgl-card @tap=handleTap :title=${a + b}",
];

const VIEW_CASES = [
  {
    id: "malformed-invalid-selector-key",
    expectedNodes: [{ rawKey: ":invalid", tagName: ":invalid", bindingNames: [] }],
    viewText: [
      "template:",
      "  - \":invalid\": null",
      "",
    ].join("\n"),
  },
  {
    id: "malformed-attribute-token",
    expectedNodes: [{ rawKey: "rtgl-button =${oops}", tagName: "rtgl-button", bindingNames: [""] }],
    viewText: [
      "template:",
      "  - \"rtgl-button =${oops}\": Tap",
      "",
    ].join("\n"),
  },
  {
    id: "control-flow-with-selector-child",
    expectedNodes: [{ rawKey: "rtgl-button :label=${title}", tagName: "rtgl-button", bindingNames: [":label"] }],
    viewText: [
      "template:",
      "  - \"$if isVisible\":",
      "      - \"rtgl-button :label=${title}\": Tap",
      "",
    ].join("\n"),
  },
];

const createLineOffsets = (source = "") => {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      offsets.push(index + 1);
    }
  }
  return offsets;
};

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

const normalized = (value) => JSON.stringify(stripUndefined(value));

const isElementAst = (node) => (
  node?.type === "Element"
  && typeof node.tagName === "string"
  && typeof node.rawKey === "string"
  && Number.isInteger(node.range?.line)
  && Array.isArray(node.attributes)
  && node.attributes.every((attribute) => attribute?.type === "Attribute" && Number.isInteger(attribute.range?.column))
);

const main = () => {
  const failures = [];

  SELECTOR_CASES.forEach((rawKey, index) => {
    try {
      const lineOffsets = createLineOffsets(rawKey);
      const parseA = parseYahtmlSelectorKey({
        rawKey,
        line: 1,
        lineText: rawKey,
        lineOffsets,
      });
      const parseB = parseYahtmlSelectorKey({
        rawKey,
        line: 1,
        lineText: rawKey,
        lineOffsets,
      });
      if (normalized(parseA) !== normalized(parseB)) {
        failures.push(`selector case ${index}: parser output is non-deterministic`);
      }
      if (!isElementAst(parseA.ast)) {
        failures.push(`selector case ${index}: parser output is not an Element AST`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`selector case ${index}: threw '${message}'`);
    }
  });

  VIEW_CASES.forEach((viewCase) => {
    try {
      const viewYaml = loadYaml(viewCase.viewText);
      const astA = collectTemplateAstFromView({ viewText: viewCase.viewText, viewYaml });
      const astB = collectTemplateAstFromView({ viewText: viewCase.viewText, viewYaml });
      if (normalized(astA) !== normalized(astB)) {
        failures.push(`${viewCase.id}: template AST output is non-deterministic`);
      }

      const nodes = (astA?.nodes || []).map((node) => ({
        rawKey: node.rawKey,
        tagName: node.tagName,
        bindingNames: (node.attributes || []).map((attribute) => attribute.bindingName),
      }));
      if (astA?.type !== "Template" || !astA.nodes.every(isElementAst)
        || normalized(nodes) !== normalized(viewCase.expectedNodes)) {
        failures.push(`${viewCase.id}: expected template AST nodes ${normalized(viewCase.expectedNodes)}, got ${normalized(nodes)}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${viewCase.id}: threw '${message}'`);
    }
  });

  if (failures.length > 0) {
    console.error("YAHTML parser crash-containment failures:");
    failures.forEach((failure) => {
      console.error(`- ${failure}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(
    `YAHTML parser crash containment pass (selectors=${SELECTOR_CASES.length}, views=${VIEW_CASES.length}).`,
  );
};

main();
