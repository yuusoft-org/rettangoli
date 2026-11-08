// Small helpers for config and front matter validation messages.

export function valueType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
