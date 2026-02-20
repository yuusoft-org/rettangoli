#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { verifySignedManifest } from "../src/release/signing.js";

const artifactDir = path.resolve(process.cwd(), process.argv[2] || ".rettangoli/release");
const signingKey = process.env.RTGL_RELEASE_SIGNING_KEY || "local-dev-signing-key";
const manifestPath = path.join(artifactDir, "release-manifest.json");
const signaturePath = path.join(artifactDir, "release-signature.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const signatureEnvelope = JSON.parse(readFileSync(signaturePath, "utf8"));
const verification = verifySignedManifest({
  manifest,
  signatureEnvelope,
  signingKey,
});

assert.equal(verification.ok, true, "release artifact signature verification failed");
console.log("Release artifact signature verification pass.");
