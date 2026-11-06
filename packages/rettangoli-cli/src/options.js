import { InvalidArgumentError } from "commander";

export function collectValues(value, previous = []) {
  return [...previous, value];
}

export function parseIntegerOption(value) {
  if (!/^-?\d+$/.test(String(value))) {
    throw new InvalidArgumentError(`Expected an integer but received "${value}"`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed)) {
    throw new InvalidArgumentError(
      `Expected a safe integer but received "${value}"`,
    );
  }

  return parsed;
}

export function parsePortOption(value) {
  const parsed = parseIntegerOption(value);
  if (parsed < 1 || parsed > 65535) {
    throw new InvalidArgumentError(
      `Port must be between 1 and 65535, received "${value}"`,
    );
  }
  return parsed;
}

export function parseIsolationOption(value) {
  if (value === "fast" || value === "strict") {
    return value;
  }
  throw new InvalidArgumentError(
    `Isolation must be "fast" or "strict", received "${value}"`,
  );
}

const DECIMAL_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?$/i;

// A decimal number, optionally with a trailing "%" (dropped). Accepts exactly
// the inputs that parseFloat reads completely and returns the same value.
export function parseNumberOption(value) {
  const text = String(value).trim();
  if (!DECIMAL_NUMBER.test(text)) {
    throw new InvalidArgumentError(
      `Expected a number (use "." for decimals) but received "${value}"`,
    );
  }
  return Number(text.replace(/%$/, ""));
}
