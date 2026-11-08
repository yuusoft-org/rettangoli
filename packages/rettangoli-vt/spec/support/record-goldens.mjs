// Golden file helpers shared by the golden specs, plus the recorder for the step
// engine golden:
//
//   node spec/support/record-goldens.mjs                  # show which case ids differ
//   UPDATE_GOLDEN=1 node spec/support/record-goldens.mjs  # rewrite golden.json
//
// Golden files are only ever rewritten when UPDATE_GOLDEN=1, and the ids that
// changed are always printed so they can be reviewed against the bug they belong to.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { load as loadYaml } from "js-yaml";
import { replayStep } from "./recording-page.js";

const here = dirname(fileURLToPath(import.meta.url));
export const STEP_GOLDEN_DIR = resolve(here, "../fixtures/step-golden");

export function shouldUpdateGolden() {
  return process.env.UPDATE_GOLDEN === "1";
}

// Pretty-prints plain objects down to `expandDepth` levels (one line per entry at
// the deepest expanded level) and compact JSON below that, so golden diffs stay
// one line per case.
export function formatGolden(value, expandDepth = 1, depth = 0, indent = "") {
  const isPlainObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const keys = isPlainObject ? Object.keys(value) : [];
  if (!isPlainObject || depth >= expandDepth || keys.length === 0) {
    return JSON.stringify(value);
  }
  const inner = `${indent}  `;
  const lines = keys.map(
    (key) => `${inner}${JSON.stringify(key)}: ${formatGolden(value[key], expandDepth, depth + 1, inner)}`,
  );
  return `{\n${lines.join(",\n")}\n${indent}}`;
}

// Compares two goldens entry by entry (top-level keys only).
export function diffGolden(previous, next) {
  const before = previous ?? {};
  const added = Object.keys(next).filter((id) => !(id in before));
  const removed = Object.keys(before).filter((id) => !(id in next));
  const changed = Object.keys(next).filter(
    (id) => id in before && JSON.stringify(before[id]) !== JSON.stringify(next[id]),
  );
  return { added, removed, changed };
}

export function readGolden(goldenPath) {
  return existsSync(goldenPath) ? JSON.parse(readFileSync(goldenPath, "utf8")) : null;
}

// Prints the ids that differ from the stored golden and, only when
// UPDATE_GOLDEN=1, rewrites it. Returns the diff.
export function syncGolden(goldenPath, next, { expandDepth = 1, log = console.log } = {}) {
  const diff = diffGolden(readGolden(goldenPath), next);
  const total = diff.added.length + diff.removed.length + diff.changed.length;
  for (const [label, ids] of Object.entries(diff)) {
    for (const id of ids) {
      log(`${label}: ${id}`);
    }
  }
  if (shouldUpdateGolden()) {
    mkdirSync(dirname(goldenPath), { recursive: true });
    writeFileSync(goldenPath, `${formatGolden(next, expandDepth)}\n`);
    log(`${goldenPath}: wrote ${Object.keys(next).length} entries (${total} changed).`);
  } else if (total === 0) {
    log(`${goldenPath}: up to date.`);
  } else {
    log(`${goldenPath}: ${total} entries differ. Re-run with UPDATE_GOLDEN=1 to rewrite.`);
  }
  return diff;
}

export function loadStepCases() {
  const cases = loadYaml(readFileSync(resolve(STEP_GOLDEN_DIR, "cases.yaml"), "utf8"));
  const seen = new Set();
  for (const entry of cases) {
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate step golden case id: ${entry.id}`);
    }
    seen.add(entry.id);
  }
  return cases;
}

// { [caseId]: { [personality]: { calls, error } } } for every case.
export async function recordStepGolden(createSteps) {
  const golden = {};
  for (const entry of loadStepCases()) {
    golden[entry.id] = {};
    for (const personality of entry.personalities ?? ["default"]) {
      golden[entry.id][personality] = await replayStep(createSteps, entry.step, { personality });
    }
  }
  return golden;
}

async function main() {
  const { createSteps } = await import("../../src/createSteps.js");
  const diff = syncGolden(resolve(STEP_GOLDEN_DIR, "golden.json"), await recordStepGolden(createSteps), {
    expandDepth: 1,
  });
  const differs = diff.added.length + diff.removed.length + diff.changed.length > 0;
  process.exit(differs && !shouldUpdateGolden() ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
