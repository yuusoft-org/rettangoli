#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { verifyReleaseProvenance } from "../src/release/provenance.js";

const artifactDir = path.resolve(process.cwd(), process.argv[2] || ".rettangoli/release");
const manifestPath = path.join(artifactDir, "release-manifest.json");
const provenancePath = path.join(artifactDir, "release-provenance.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const provenance = JSON.parse(readFileSync(provenancePath, "utf8"));

const verification = verifyReleaseProvenance({
  artifactDir,
  manifest,
  provenance,
});

assert.equal(verification.ok, true, "release provenance verification failed");
console.log("Release provenance verification pass.");
