#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

const getArg = (flag, fallback = "") => {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
};

const inputPath = getArg("--input");
const outputPath = getArg("--output", "./minimized-corpus.json");
const maxCases = Number.parseInt(getArg("--max-cases", "50"), 10);

if (!inputPath) {
  console.error("Missing required --input <path>.");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(path.resolve(process.cwd(), inputPath), "utf8"));
const cases = Array.isArray(raw) ? raw : (Array.isArray(raw?.cases) ? raw.cases : []);

const seen = new Set();
const minimized = [];

[...cases]
  .map((entry) => ({
    ...entry,
    reason: String(entry?.reason || "unknown"),
    payload: typeof entry?.payload === "string" ? entry.payload : JSON.stringify(entry?.payload || {}),
  }))
  .sort((left, right) => (
    left.reason.localeCompare(right.reason)
    || left.payload.length - right.payload.length
  ))
  .forEach((entry) => {
    if (minimized.length >= maxCases) {
      return;
    }
    const fingerprint = `${entry.reason}::${entry.payload}`;
    if (seen.has(fingerprint)) {
      return;
    }
    seen.add(fingerprint);
    minimized.push(entry);
  });

writeFileSync(path.resolve(process.cwd(), outputPath), `${JSON.stringify({
  version: 1,
  inputCount: cases.length,
  outputCount: minimized.length,
  cases: minimized,
}, null, 2)}\n`, "utf8");

console.log(`Corpus minimization complete: input=${cases.length} output=${minimized.length} -> ${outputPath}`);
