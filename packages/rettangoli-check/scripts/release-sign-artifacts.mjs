#!/usr/bin/env node

import path from "node:path";
import {
  createReleaseManifest,
  signReleaseManifest,
  writeSignedManifest,
} from "../src/release/signing.js";

const artifactDir = path.resolve(process.cwd(), process.argv[2] || ".rettangoli/release");
const signingKey = process.env.RTGL_RELEASE_SIGNING_KEY || "local-dev-signing-key";
const keyId = process.env.RTGL_RELEASE_SIGNING_KEY_ID || "local-dev-key";

const manifest = createReleaseManifest({
  artifactDir,
});
const signatureEnvelope = signReleaseManifest({
  manifest,
  signingKey,
  keyId,
});
const output = writeSignedManifest({
  artifactDir,
  manifest,
  signatureEnvelope,
});

console.log(`Signed release manifest: ${output.manifestPath}`);
console.log(`Signature envelope: ${output.signaturePath}`);
