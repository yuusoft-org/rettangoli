import { createHmac, createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const EXCLUDED_FILE_NAMES = new Set([
  "release-manifest.json",
  "release-signature.json",
  "release-provenance.json",
]);

const walkFiles = (rootDir, output = []) => {
  const entries = readdirSync(rootDir);
  entries.forEach((entry) => {
    const fullPath = path.join(rootDir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkFiles(fullPath, output);
      return;
    }
    if (stat.isFile()) {
      output.push(fullPath);
    }
  });
  return output;
};

const toRelativePath = (rootDir, filePath) => {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
};

export const hashFileSha256 = (filePath) => {
  const buffer = readFileSync(filePath);
  return createHash("sha256").update(buffer).digest("hex");
};

export const createReleaseManifest = ({
  artifactDir,
  generatedBy = "@rettangoli/check",
} = {}) => {
  const absoluteDir = path.resolve(artifactDir || process.cwd());
  const artifacts = walkFiles(absoluteDir)
    .filter((filePath) => !EXCLUDED_FILE_NAMES.has(path.basename(filePath)))
    .map((filePath) => ({
      path: toRelativePath(absoluteDir, filePath),
      size: statSync(filePath).size,
      sha256: hashFileSha256(filePath),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    generatedBy,
    artifactDir: absoluteDir,
    artifactCount: artifacts.length,
    artifacts,
  };
};

export const signReleaseManifest = ({
  manifest,
  signingKey,
  keyId = "local-dev-key",
} = {}) => {
  const payload = JSON.stringify(manifest);
  const key = String(signingKey || "");
  const signature = createHmac("sha256", key).update(payload).digest("hex");
  return {
    version: 1,
    keyId,
    algorithm: "hmac-sha256",
    signature,
  };
};

export const writeSignedManifest = ({
  artifactDir,
  manifest,
  signatureEnvelope,
} = {}) => {
  const absoluteDir = path.resolve(artifactDir || process.cwd());
  const manifestPath = path.join(absoluteDir, "release-manifest.json");
  const signaturePath = path.join(absoluteDir, "release-signature.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeFileSync(signaturePath, `${JSON.stringify(signatureEnvelope, null, 2)}\n`, "utf8");
  return {
    manifestPath,
    signaturePath,
  };
};

export const verifySignedManifest = ({
  manifest,
  signatureEnvelope,
  signingKey,
} = {}) => {
  const recomputed = signReleaseManifest({
    manifest,
    signingKey,
    keyId: signatureEnvelope?.keyId || "local-dev-key",
  });
  const signatureMatch = recomputed.signature === signatureEnvelope?.signature;
  const hashMismatches = [];
  (manifest?.artifacts || []).forEach((artifact) => {
    const filePath = path.join(manifest.artifactDir, artifact.path);
    const nextHash = hashFileSha256(filePath);
    if (nextHash !== artifact.sha256) {
      hashMismatches.push({
        path: artifact.path,
        expected: artifact.sha256,
        actual: nextHash,
      });
    }
  });

  return {
    ok: signatureMatch && hashMismatches.length === 0,
    signatureMatch,
    hashMismatches,
  };
};
