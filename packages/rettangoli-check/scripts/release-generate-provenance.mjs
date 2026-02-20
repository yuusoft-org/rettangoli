#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { createReleaseProvenance, writeReleaseProvenance } from "../src/release/provenance.js";

const artifactDir = path.resolve(process.cwd(), process.argv[2] || ".rettangoli/release");
const manifestPath = path.join(artifactDir, "release-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const provenance = createReleaseProvenance({
  manifest,
});
const outputPath = writeReleaseProvenance({
  artifactDir,
  provenance,
});

console.log(`Release provenance written: ${outputPath}`);
