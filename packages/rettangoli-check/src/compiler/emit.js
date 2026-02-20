import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { canonicalizeIrValue } from "../ir/serialize.js";

export const serializeCompileArtifact = (artifact = {}) => {
  const canonical = canonicalizeIrValue(artifact);
  return `${JSON.stringify(canonical, null, 2)}\n`;
};

export const emitCompileArtifact = ({
  artifact = {},
  outDir = ".rettangoli/compile",
  fileName = "artifact.json",
} = {}) => {
  const resolvedOutDir = path.resolve(outDir);
  mkdirSync(resolvedOutDir, { recursive: true });
  const artifactPath = path.join(resolvedOutDir, fileName);
  writeFileSync(artifactPath, serializeCompileArtifact(artifact), "utf8");

  return {
    outDir: resolvedOutDir,
    artifactPath,
  };
};
