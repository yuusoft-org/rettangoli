import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const sha256Text = (value = "") => createHash("sha256").update(String(value)).digest("hex");

export const createReleaseProvenance = ({
  manifest,
  source = {},
  builder = {},
} = {}) => {
  const payloadHash = sha256Text(JSON.stringify(manifest));
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    predicateType: "https://slsa.dev/provenance/v1",
    builder: {
      id: builder.id || "@rettangoli/check-local",
      runtime: builder.runtime || process.version,
      platform: builder.platform || process.platform,
      arch: builder.arch || process.arch,
    },
    source: {
      repo: source.repo || process.env.GITHUB_REPOSITORY || "local",
      ref: source.ref || process.env.GITHUB_REF || "local",
      sha: source.sha || process.env.GITHUB_SHA || "local",
    },
    subject: (manifest?.artifacts || []).map((artifact) => ({
      name: artifact.path,
      digest: {
        sha256: artifact.sha256,
      },
      size: artifact.size,
    })),
    manifestDigest: {
      sha256: payloadHash,
    },
  };
};

export const writeReleaseProvenance = ({
  artifactDir,
  provenance,
} = {}) => {
  const outputPath = path.join(path.resolve(artifactDir || process.cwd()), "release-provenance.json");
  writeFileSync(outputPath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");
  return outputPath;
};

export const verifyReleaseProvenance = ({
  artifactDir,
  manifest,
  provenance,
} = {}) => {
  const artifactMap = new Map((manifest?.artifacts || []).map((artifact) => [artifact.path, artifact.sha256]));
  const subject = Array.isArray(provenance?.subject) ? provenance.subject : [];
  const mismatches = [];

  subject.forEach((entry) => {
    const expected = artifactMap.get(entry?.name);
    const actual = entry?.digest?.sha256;
    if (!expected || expected !== actual) {
      mismatches.push({
        path: entry?.name || "unknown",
        expected,
        actual,
      });
    }
  });

  const filePath = path.join(path.resolve(artifactDir || process.cwd()), "release-provenance.json");
  const fileDigest = sha256Text(readFileSync(filePath, "utf8"));

  return {
    ok: mismatches.length === 0,
    mismatches,
    fileDigest,
  };
};
