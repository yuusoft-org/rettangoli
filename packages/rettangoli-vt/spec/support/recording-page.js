import { createHash } from "node:crypto";

// A Proxy-based fake Playwright `page` that records every call it receives.
//
// Each recorded call is `[path, ...args]`, for example
//   ["mouse.click", 10, 20, { "button": "left" }]
//   ['getByTestId("a").locator("input, textarea, button, select, a").first().count']
// Locator chain methods (locator, getByTestId, first, ...) are folded into the
// path of the leaf call, so the log shows which element a command acted on.
// Function arguments are recorded as `fn:<sha1>` of their whitespace- and
// semicolon-normalized source, so moving or re-indenting a page function does not
// change the log, but editing it does. Strings over 80 characters are recorded
// the same way (`str:<sha1>(<length>)`) to keep goldens small.

export const DEFAULT_PAGE_URL = "http://localhost:3001/candidate/pages/home.html";

const CHAIN_METHODS = new Set([
  "locator",
  "getByTestId",
  "getByRole",
  "getByText",
  "first",
  "last",
  "nth",
  "filter",
]);

// Behavior knobs. Everything not listed resolves to `undefined`.
export const PERSONALITIES = {
  // Every locator exists once, page.url() is a normal candidate URL.
  default: {},
  // Locators match nothing: `select` falls back to the host element and
  // `assert exists` fails.
  noInner: { count: 0 },
  // Every waitFor/waitForSelector rejects with a Playwright-style timeout.
  waitTimeout: { waitTimeout: true },
  // page.url() never matches the expected URL.
  urlMismatch: { url: "about:blank" },
  // page.evaluate() resolves to a structured value.
  evalValue: { evaluate: { value: { a: [1, "x"], n: null } } },
  // page.evaluate() rejects.
  evalThrows: { evaluate: { error: "boom" } },
};

const MAX_INLINE_STRING_LENGTH = 80;

function sha1(text) {
  return createHash("sha1").update(text.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);
}

// Vitest's transform adds semicolons after blocks, so they are ignored as well:
// the same function must hash identically under plain node and under vitest.
export function hashFunction(fn) {
  return `fn:${sha1(Function.prototype.toString.call(fn).replace(/;/g, ""))}`;
}

export function normalizeValue(value) {
  if (value === undefined) {
    return "<undefined>";
  }
  if (typeof value === "function") {
    return hashFunction(value);
  }
  if (typeof value === "string" && value.length > MAX_INLINE_STRING_LENGTH) {
    // Long literals (injected CSS, scripts) are recorded as a whitespace-insensitive hash.
    return `str:${sha1(value)}(${value.length})`;
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return "NaN";
    }
    if (!Number.isFinite(value)) {
      return value > 0 ? "Infinity" : "-Infinity";
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === "bigint" || typeof value === "symbol") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value !== null && typeof value === "object") {
    const normalized = {};
    for (const [key, entry] of Object.entries(value)) {
      normalized[key] = normalizeValue(entry);
    }
    return normalized;
  }
  return value;
}

function chainSegment(name, args) {
  return `${name}(${args.map((arg) => JSON.stringify(normalizeValue(arg))).join(", ")})`;
}

export function createRecordingPage({ personality = "default", calls = [] } = {}) {
  const behavior = PERSONALITIES[personality];
  if (!behavior) {
    throw new Error(`Unknown recording page personality: ${personality}`);
  }

  const leafResult = (name) => {
    if (name === "count") {
      return { sync: false, value: behavior.count ?? 1 };
    }
    if (name === "textContent") {
      return { sync: false, value: "Hello world" };
    }
    if (name === "url") {
      return { sync: true, value: behavior.url ?? DEFAULT_PAGE_URL };
    }
    if (name === "isClosed") {
      return { sync: true, value: false };
    }
    if (name === "evaluate") {
      if (behavior.evaluate?.error) {
        return { sync: false, error: new Error(behavior.evaluate.error) };
      }
      return { sync: false, value: structuredClone(behavior.evaluate?.value) };
    }
    if (behavior.waitTimeout && name.startsWith("waitFor") && name !== "waitForTimeout") {
      return { sync: false, error: new Error("Timeout 30000ms exceeded.") };
    }
    return { sync: false, value: undefined };
  };

  const createNode = (path) =>
    new Proxy(function recordingNode() {}, {
      get(_target, property) {
        // Symbols (Symbol.toPrimitive, ...) and `then` must not look like members,
        // otherwise awaiting a locator would hang or misbehave.
        if (typeof property === "symbol" || property === "then") {
          return undefined;
        }
        return createNode(path === "" ? property : `${path}.${property}`);
      },
      apply(_target, _thisArg, args) {
        const separator = path.lastIndexOf(".");
        const name = separator === -1 ? path : path.slice(separator + 1);
        if (CHAIN_METHODS.has(name)) {
          return createNode(`${path.slice(0, separator + 1)}${chainSegment(name, args)}`);
        }
        calls.push([path, ...args.map(normalizeValue)]);
        const result = leafResult(name);
        if (result.sync) {
          return result.value;
        }
        return result.error ? Promise.reject(result.error) : Promise.resolve(result.value);
      },
    });

  return createNode("");
}

// Runs one raw step through `createSteps` against a fresh recording page.
// `createSteps` is injected so the same replay works for any checkout of the package.
// Resolves to `{ calls, error }`; `error` is the thrown message or null.
export async function replayStep(
  createSteps,
  step,
  { personality = "default", baseName = "pages/button" } = {},
) {
  const calls = [];
  const page = createRecordingPage({ personality, calls });
  const executor = createSteps(page, {
    baseName,
    takeAndSaveScreenshot: async (_page, name) => {
      calls.push(["context.takeAndSaveScreenshot", name]);
      return `${name}-01.webp`;
    },
  });

  const originalLog = console.log;
  console.log = (...args) => {
    calls.push(["console.log", ...args.map(normalizeValue)]);
  };
  let error = null;
  try {
    await executor.executeStep(structuredClone(step));
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  } finally {
    console.log = originalLog;
  }
  return { calls, error };
}
