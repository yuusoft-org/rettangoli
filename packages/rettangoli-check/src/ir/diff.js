import { canonicalizeIrValue } from "./serialize.js";

const flattenValue = (value, prefix = "", result = new Map()) => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      result.set(prefix, "[]");
      return result;
    }
    value.forEach((entry, index) => {
      const nextPrefix = prefix ? `${prefix}.${index}` : String(index);
      flattenValue(entry, nextPrefix, result);
    });
    return result;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      result.set(prefix, "{}");
      return result;
    }
    keys.forEach((key) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenValue(value[key], nextPrefix, result);
    });
    return result;
  }

  result.set(prefix, JSON.stringify(value));
  return result;
};

export const diffCompilerIr = ({ before = {}, after = {}, maxChanges = 200 } = {}) => {
  const left = flattenValue(canonicalizeIrValue(before));
  const right = flattenValue(canonicalizeIrValue(after));

  const paths = new Set([...left.keys(), ...right.keys()]);
  const changes = [];

  [...paths].sort((a, b) => a.localeCompare(b)).forEach((path) => {
    if (changes.length >= maxChanges) {
      return;
    }

    const leftValue = left.has(path) ? left.get(path) : undefined;
    const rightValue = right.has(path) ? right.get(path) : undefined;
    if (leftValue === rightValue) {
      return;
    }

    const type = leftValue === undefined
      ? "added"
      : rightValue === undefined
        ? "removed"
        : "changed";

    changes.push({
      path,
      type,
      before: leftValue,
      after: rightValue,
    });
  });

  return {
    changed: changes.length > 0,
    changes,
  };
};
