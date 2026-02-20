#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createReleaseManifest,
  signReleaseManifest,
  verifySignedManifest,
  writeSignedManifest,
} from "../src/release/signing.js";
import {
  createReleaseProvenance,
  verifyReleaseProvenance,
  writeReleaseProvenance,
} from "../src/release/provenance.js";

const main = async () => {
  const artifactDir = mkdtempSync(path.join(tmpdir(), "rtgl-release-proof-"));
  mkdirSync(path.join(artifactDir, "artifacts"), { recursive: true });
  writeFileSync(path.join(artifactDir, "artifacts", "compiler-artifact.json"), "{\"ok\":true}\n", "utf8");
  writeFileSync(path.join(artifactDir, "artifacts", "diagnostics.json"), "{\"schemaVersion\":1}\n", "utf8");

  const signingKey = "test-signing-key";
  const manifest = createReleaseManifest({
    artifactDir,
  });
  const signatureEnvelope = signReleaseManifest({
    manifest,
    signingKey,
    keyId: "test-key-id",
  });
  writeSignedManifest({
    artifactDir,
    manifest,
    signatureEnvelope,
  });

  const signatureVerification = verifySignedManifest({
    manifest,
    signatureEnvelope,
    signingKey,
  });
  assert.equal(signatureVerification.ok, true, "expected signed manifest verification to pass");

  const provenance = createReleaseProvenance({
    manifest,
    source: {
      repo: "local/test",
      ref: "refs/heads/main",
      sha: "deadbeef",
    },
  });
  writeReleaseProvenance({
    artifactDir,
    provenance,
  });
  const provenanceVerification = verifyReleaseProvenance({
    artifactDir,
    manifest,
    provenance,
  });
  assert.equal(provenanceVerification.ok, true, "expected release provenance verification to pass");

  rmSync(artifactDir, { recursive: true, force: true });
  console.log("Release provenance gate pass (manifest signing + provenance generation + verification).");
};

await main();
