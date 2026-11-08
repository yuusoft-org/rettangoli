// Helpers shared by the step actions and the assert grammar. No imports: see createSteps.js.

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function toNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${fieldName}: expected a finite number, got "${value}".`);
  }
  return parsed;
}

export function toPositiveInteger(value, fieldName) {
  const parsed = toNumber(value, fieldName);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${fieldName}: expected an integer >= 1, got "${value}".`);
  }
  return parsed;
}

export function parseTimeoutValue(value) {
  if (value === undefined) {
    return undefined;
  }
  const timeout = toNumber(value, "timeout");
  if (timeout < 0) {
    throw new Error(`Invalid timeout: expected >= 0, got ${timeout}.`);
  }
  return timeout;
}

// The capture runner passes `context.evaluate` to bound page evaluations. Without it
// (deep imports, tests) the target is called directly, with the same arguments as before.
export function evaluateIn(context, target, label, fn, ...args) {
  if (typeof context?.evaluate === "function") {
    return context.evaluate(target, fn, args[0], label);
  }
  return target.evaluate(fn, ...args);
}
