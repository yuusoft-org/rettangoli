#!/usr/bin/env node

import assert from "node:assert/strict";
import { extractModuleExports } from "../src/core/parsers.js";

const normalize = (result = {}) => {
  const namedExports = [...(result.namedExports || [])].sort();
  const exportStarSpecifiers = [...(result.exportStarSpecifiers || [])].sort();
  const namespaceReExports = [...(result.namespaceReExports || [])]
    .map((entry) => ({
      moduleRequest: entry.moduleRequest,
      exportedName: entry.exportedName,
    }))
    .sort((a, b) => (
      a.moduleRequest.localeCompare(b.moduleRequest)
      || a.exportedName.localeCompare(b.exportedName)
    ));
  const namedReExports = [...(result.namedReExports || [])]
    .map((entry) => ({
      moduleRequest: entry.moduleRequest,
      importedName: entry.importedName,
      exportedName: entry.exportedName,
    }))
    .sort((a, b) => (
      a.moduleRequest.localeCompare(b.moduleRequest)
      || a.importedName.localeCompare(b.importedName)
      || a.exportedName.localeCompare(b.exportedName)
    ));

  return {
    namedExports,
    exportStarSpecifiers,
    namespaceReExports,
    namedReExports,
    parseFailed: Boolean(result.parseFailed),
    backendUsed: result.backendUsed,
  };
};

const assertSetIncludes = (setLike = [], expected = []) => {
  expected.forEach((value) => {
    assert.ok(setLike.includes(value), `expected value '${value}' not found in [${setLike.join(", ")}]`);
  });
};

const CASES = [
  {
    name: "default function export declaration",
    filePath: "default-function.js",
    source: "export default function focusInput() {}",
    check: (actual) => {
      assertSetIncludes(actual.namedExports, ["default"]);
    },
  },
  {
    name: "default class export declaration",
    filePath: "default-class.js",
    source: "export default class FocusInput {}",
    check: (actual) => {
      assertSetIncludes(actual.namedExports, ["default"]);
    },
  },
  {
    name: "named default alias re-export",
    filePath: "default-alias-reexport.js",
    source: "export { default as handleTap } from './dep.js';",
    check: (actual) => {
      assert.deepEqual(actual.namedReExports, [{
        moduleRequest: "./dep.js",
        importedName: "default",
        exportedName: "handleTap",
      }]);
    },
  },
  {
    name: "default exportedName re-export",
    filePath: "default-exported-name-reexport.js",
    source: "export { handleTap as default } from './dep.js';",
    check: (actual) => {
      assert.deepEqual(actual.namedReExports, [{
        moduleRequest: "./dep.js",
        importedName: "handleTap",
        exportedName: "default",
      }]);
    },
  },
  {
    name: "type-only re-export ignored",
    filePath: "type-only-reexport.ts",
    source: "export type { HandleTap } from './dep.ts';",
    check: (actual) => {
      assert.deepEqual(actual.namedReExports, []);
      assert.deepEqual(actual.namedExports, []);
    },
  },
  {
    name: "typed destructured export declaration",
    filePath: "typed-destructured-export.ts",
    source: "const bag: { handleTap: () => void } = { handleTap: () => {} }; export const { handleTap: handleTapAlias }: { handleTap: () => void } = bag;",
    check: (actual) => {
      assertSetIncludes(actual.namedExports, ["handleTapAlias"]);
    },
  },
  {
    name: "typescript export assignment",
    filePath: "ts-export-assignment.ts",
    source: "const handleTap = () => {}; export = handleTap;",
    check: (actual) => {
      assertSetIncludes(actual.namedExports, ["default"]);
    },
  },
];

CASES.forEach((testCase) => {
  const first = normalize(extractModuleExports({
    sourceCode: testCase.source,
    filePath: testCase.filePath,
  }));
  const second = normalize(extractModuleExports({
    sourceCode: testCase.source,
    filePath: testCase.filePath,
  }));

  assert.equal(first.backendUsed, "oxc", `expected oxc backend for case '${testCase.name}'`);
  assert.equal(first.parseFailed, false, `unexpected parse failure for case '${testCase.name}'`);
  assert.deepEqual(first, second, `non-deterministic extraction for case '${testCase.name}'`);
  testCase.check(first);
});

console.log(`FE frontend Oxc contract pass (${CASES.length} case(s)).`);
