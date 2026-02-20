import { createHash } from "node:crypto";
import path from "node:path";
import { canonicalizeIrValue } from "../ir/serialize.js";

const normalizePathForHash = ({ cwd = process.cwd(), filePath = "unknown" }) => {
  const normalized = String(filePath || "unknown");
  if (normalized === "unknown") {
    return "unknown";
  }
  if (!path.isAbsolute(normalized)) {
    return normalized.replaceAll("\\", "/");
  }
  return path.relative(cwd, normalized).replaceAll("\\", "/");
};

const normalizeFilePathsDeep = ({ value, cwd }) => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeFilePathsDeep({ value: entry, cwd }));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const result = {};
  Object.keys(value).forEach((key) => {
    const childValue = value[key];
    if (key === "filePath" && typeof childValue === "string") {
      result[key] = normalizePathForHash({ cwd, filePath: childValue });
      return;
    }
    result[key] = normalizeFilePathsDeep({ value: childValue, cwd });
  });
  return result;
};

export const hashCompilerSemanticCore = ({ compilerIr = {}, cwd = process.cwd() } = {}) => {
  const payload = canonicalizeIrValue(normalizeFilePathsDeep({
    cwd,
    value: {
      structural: compilerIr?.structural || {},
      semantic: compilerIr?.semantic || {},
      typedContract: compilerIr?.typedContract || {},
    },
  }));
  const serialized = JSON.stringify(payload);
  return createHash("sha256").update(serialized).digest("hex");
};
