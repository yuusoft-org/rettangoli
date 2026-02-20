#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dump as dumpYaml } from "js-yaml";
import { createHash } from "node:crypto";
import { loadPolicyPack } from "../src/cli/policy.js";
import {
  DEFAULT_LANGUAGE_LEVEL,
  isKnownLanguageLevel,
  LANGUAGE_LEVELS,
  resolveLanguageLevelTransition,
} from "../src/cli/languageLevels.js";

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }
  return value;
};

const signDigest = (policy) => {
  const clone = { ...policy };
  delete clone.signature;
  const payload = JSON.stringify(canonicalize(clone));
  return createHash("sha256").update(payload).digest("hex");
};

assert.ok(isKnownLanguageLevel(DEFAULT_LANGUAGE_LEVEL));
assert.deepEqual(LANGUAGE_LEVELS, [
  "strict-legacy-parity",
  "strict-deterministic-core",
  "compiler-platform-v1",
]);
assert.deepEqual(
  resolveLanguageLevelTransition({
    fromLevel: "strict-legacy-parity",
    toLevel: "compiler-platform-v1",
  }),
  ["strict-legacy-parity", "strict-deterministic-core", "compiler-platform-v1"],
);

const sandboxRoot = mkdtempSync(path.join(tmpdir(), "rtgl-gov-compat-"));
const policyDir = path.join(sandboxRoot, "policy");
mkdirSync(policyDir, { recursive: true });

try {
  const unsignedPolicyPath = path.join(policyDir, "unsigned.yaml");
  writeFileSync(unsignedPolicyPath, dumpYaml({
    name: "legacy-unsigned-policy",
    rules: [{ id: "RTGL-CONTRACT-001", severity: "error", enabled: true }],
  }), "utf8");

  const signedPolicy = {
    name: "signed-policy",
    rules: [{ id: "RTGL-CONTRACT-073", severity: "warn", enabled: true }],
  };
  const signedPolicyPath = path.join(policyDir, "signed.yaml");
  writeFileSync(signedPolicyPath, dumpYaml({
    ...signedPolicy,
    signature: {
      algorithm: "sha256",
      digest: signDigest(signedPolicy),
    },
  }), "utf8");

  const unsafePolicyPath = path.join(policyDir, "unsafe.yaml");
  writeFileSync(unsafePolicyPath, dumpYaml({
    name: "unsafe-policy",
    rules: [
      {
        id: "RTGL-CONTRACT-001",
        severity: "error",
        enabled: true,
        script: "rm -rf /",
      },
    ],
  }), "utf8");

  const unsignedPack = loadPolicyPack({
    cwd: policyDir,
    policyPath: "./unsigned.yaml",
  });
  assert.equal(unsignedPack.name, "legacy-unsigned-policy");
  assert.equal(unsignedPack.signature.enabled, false);

  assert.throws(() => {
    loadPolicyPack({
      cwd: policyDir,
      policyPath: "./unsigned.yaml",
      verifySignature: true,
    });
  }, /must define a signature/);

  const signedPack = loadPolicyPack({
    cwd: policyDir,
    policyPath: "./signed.yaml",
    verifySignature: true,
  });
  assert.equal(signedPack.signature.verified, true);

  assert.throws(() => {
    loadPolicyPack({
      cwd: policyDir,
      policyPath: "./unsafe.yaml",
    });
  }, /unsafe key/);
} finally {
  rmSync(sandboxRoot, { recursive: true, force: true });
}

console.log("Governance backward compatibility contract pass (language levels + policy signatures + safety boundaries).");
