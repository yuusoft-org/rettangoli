#!/usr/bin/env node

import {
  extractModuleExports,
  extractModuleExportsRegexLegacy,
} from "../src/core/parsers.js";

const CASES = 300;

const seededRandom = (seed = 1337) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const pick = (rng, values) => {
  const index = Math.floor(rng() * values.length);
  return values[index];
};

const createCaseSource = (rng) => {
  const nameA = pick(rng, ["alpha", "beta", "gamma", "delta"]);
  const nameB = pick(rng, ["handleTap", "setCount", "focusInput", "valueChanged"]);
  const list = [
    `export function ${nameA}() {}`,
    `export class ${nameA.charAt(0).toUpperCase() + nameA.slice(1)} {}`,
    `export const ${nameB} = () => {};`,
    `export { ${nameB} as ${nameA}Alias };`,
    `export * from "./dep-${nameA}.js";`,
    `export { ${nameB} } from "./dep-${nameB}.js";`,
    `export default function () {};`,
  ];

  const statementCount = 2 + Math.floor(rng() * 4);
  const statements = [];
  for (let i = 0; i < statementCount; i += 1) {
    statements.push(pick(rng, list));
  }
  return statements.join("\n");
};

const normalize = (result) => ({
  namedExports: [...(result.namedExports || [])].sort(),
  exportStarSpecifiers: [...(result.exportStarSpecifiers || [])].sort(),
  namedReExports: [...(result.namedReExports || [])]
    .map((entry) => ({
      moduleRequest: entry.moduleRequest,
      importedName: entry.importedName,
      exportedName: entry.exportedName,
    }))
    .sort((a, b) => (
      a.moduleRequest.localeCompare(b.moduleRequest)
      || a.importedName.localeCompare(b.importedName)
      || a.exportedName.localeCompare(b.exportedName)
    )),
});

const main = () => {
  const rng = seededRandom(20260214);
  const mismatches = [];

  for (let i = 0; i < CASES; i += 1) {
    const source = createCaseSource(rng);
    const filePath = `fuzz-case-${i}.js`;
    const oxc = normalize(extractModuleExports({ sourceCode: source, filePath }));
    const regex = normalize(extractModuleExportsRegexLegacy({ sourceCode: source, filePath }));

    if (JSON.stringify(oxc) !== JSON.stringify(regex)) {
      mismatches.push({ index: i, source, oxc, regex });
      if (mismatches.length >= 20) {
        break;
      }
    }
  }

  if (mismatches.length > 0) {
    console.error(`JS export differential mismatches: ${mismatches.length}`);
    mismatches.forEach((mismatch) => {
      console.error(`\n[case ${mismatch.index}]`);
      console.error(mismatch.source);
      console.error(`oxc=${JSON.stringify(mismatch.oxc)}`);
      console.error(`regex=${JSON.stringify(mismatch.regex)}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`Differential pass: ${CASES} generated cases (oxc == regex).`);
};

main();
