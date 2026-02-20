import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { load as loadYaml } from "js-yaml";

const isObjectRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const MAX_POLICY_RULES = 500;
const ALLOWED_POLICY_TOP_LEVEL_KEYS = new Set(["name", "rules", "signature", "version", "languageLevel"]);
const ALLOWED_POLICY_RULE_KEYS = new Set(["id", "severity", "enabled", "description", "tags", "metadata"]);

const assertNoUnsafeKeys = ({ value, policyPath, context = "policy" }) => {
  if (!isObjectRecord(value)) {
    return;
  }

  Object.keys(value).forEach((key) => {
    const lowered = key.toLowerCase();
    if (lowered.includes("script") || lowered.includes("command") || lowered.includes("eval")) {
      throw new Error(`Policy pack '${policyPath}' contains unsafe key '${key}' in ${context}.`);
    }
  });
};

const canonicalize = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (isObjectRecord(value)) {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
};

const signablePolicyShape = (parsed) => {
  if (!isObjectRecord(parsed)) {
    return {};
  }
  const cloned = { ...parsed };
  delete cloned.signature;
  return cloned;
};

const computePolicyDigest = (parsed = {}) => {
  const canonical = canonicalize(signablePolicyShape(parsed));
  const payload = JSON.stringify(canonical);
  return createHash("sha256").update(payload).digest("hex");
};

const verifyPolicySignature = ({ parsed, policyPath, requireSignature = false }) => {
  const signature = parsed?.signature;
  if (!signature) {
    if (requireSignature) {
      throw new Error(`Policy pack '${policyPath}' must define a signature when signature verification is required.`);
    }
    return {
      enabled: false,
      verified: false,
      algorithm: null,
      digest: null,
      computedDigest: null,
    };
  }

  if (!isObjectRecord(signature)) {
    throw new Error(`Policy pack '${policyPath}' signature must be an object.`);
  }

  const algorithm = String(signature.algorithm || "").trim().toLowerCase();
  const digest = String(signature.digest || "").trim().toLowerCase();
  if (algorithm !== "sha256") {
    throw new Error(`Policy pack '${policyPath}' signature algorithm must be 'sha256'.`);
  }
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error(`Policy pack '${policyPath}' signature digest must be a 64-char lowercase hex string.`);
  }

  const computedDigest = computePolicyDigest(parsed);
  if (computedDigest !== digest) {
    throw new Error(`Policy pack '${policyPath}' signature digest mismatch.`);
  }

  return {
    enabled: true,
    verified: true,
    algorithm,
    digest,
    computedDigest,
  };
};

export const loadPolicyPack = ({ cwd = process.cwd(), policyPath = "", verifySignature = false } = {}) => {
  const resolvedPath = path.resolve(cwd, policyPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Policy pack does not exist: ${policyPath}`);
  }

  let parsed = null;
  try {
    parsed = loadYaml(readFileSync(resolvedPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse policy pack '${policyPath}': ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!isObjectRecord(parsed)) {
    throw new Error(`Policy pack '${policyPath}' must be a YAML object.`);
  }

  const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
  if (!name) {
    throw new Error(`Policy pack '${policyPath}' must define a non-empty 'name'.`);
  }

  assertNoUnsafeKeys({
    value: parsed,
    policyPath,
    context: "top-level",
  });
  Object.keys(parsed).forEach((key) => {
    if (!ALLOWED_POLICY_TOP_LEVEL_KEYS.has(key)) {
      throw new Error(`Policy pack '${policyPath}' contains unsupported top-level key '${key}'.`);
    }
  });

  const signature = verifyPolicySignature({
    parsed,
    policyPath,
    requireSignature: verifySignature,
  });

  const rules = Array.isArray(parsed.rules) ? parsed.rules : [];
  if (rules.length > MAX_POLICY_RULES) {
    throw new Error(`Policy pack '${policyPath}' exceeds max rules (${MAX_POLICY_RULES}).`);
  }
  rules.forEach((rule, index) => {
    if (!isObjectRecord(rule)) {
      throw new Error(`Policy pack '${policyPath}' rule at index ${index} must be an object.`);
    }
    assertNoUnsafeKeys({
      value: rule,
      policyPath,
      context: `rule '${rule.id || index}'`,
    });
    Object.keys(rule).forEach((key) => {
      if (!ALLOWED_POLICY_RULE_KEYS.has(key)) {
        throw new Error(`Policy pack '${policyPath}' rule '${rule.id || index}' contains unsupported key '${key}'.`);
      }
    });
    if (typeof rule.id !== "string" || !rule.id.trim()) {
      throw new Error(`Policy pack '${policyPath}' rule at index ${index} must define non-empty 'id'.`);
    }
    if (rule.severity !== undefined && rule.severity !== "error" && rule.severity !== "warn") {
      throw new Error(`Policy pack '${policyPath}' rule '${rule.id}' has invalid severity '${String(rule.severity)}'.`);
    }
    if (rule.enabled !== undefined && typeof rule.enabled !== "boolean") {
      throw new Error(`Policy pack '${policyPath}' rule '${rule.id}' must use boolean 'enabled' when provided.`);
    }
  });

  return {
    path: resolvedPath,
    name,
    ruleCount: rules.length,
    signature,
    raw: parsed,
  };
};

export const validatePolicyPacks = ({ cwd = process.cwd(), policyPacks = [], verifySignature = false } = {}) => {
  return (Array.isArray(policyPacks) ? policyPacks : []).map((policyPath) => (
    loadPolicyPack({ cwd, policyPath, verifySignature })
  ));
};

export const runPolicyValidateCommand = ({
  cwd = process.cwd(),
  filePath = "",
  format = "text",
  verifySignature = false,
} = {}) => {
  const pack = loadPolicyPack({
    cwd,
    policyPath: filePath,
    verifySignature,
  });
  const payload = {
    contractVersion: 1,
    ok: true,
    command: "policy.validate",
    filePath: path.relative(cwd, pack.path) || filePath,
    name: pack.name,
    ruleCount: pack.ruleCount,
    signature: {
      enabled: pack.signature.enabled,
      verified: pack.signature.verified,
      algorithm: pack.signature.algorithm,
    },
  };

  if (format === "json") {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`[Policy] valid: ${payload.name} (${payload.ruleCount} rule(s)) [${payload.filePath}]`);
  }

  return payload;
};
