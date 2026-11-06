// The assert step: `{ action: "assert", type, ... }` or the legacy `{ assert: { type, ... } }`.
import { evaluateIn, isPlainObject, parseTimeoutValue } from "./shared.js";

function deepEqual(left, right) {
  // `===` also makes 0 equal -0.
  if (Object.is(left, right) || left === right) {
    return true;
  }
  if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && Array.from(left).every((entry, index) => deepEqual(entry, right[index]));
  }
  const leftKeys = Object.keys(left);
  return leftKeys.length === Object.keys(right).length && leftKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(right, key) && deepEqual(left[key], right[key]),
  );
}

function formatValue(value) {
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return `"${value}"`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function requireAssertType(assertionConfig) {
  if (!isPlainObject(assertionConfig)) {
    throw new Error("Structured assert step must be an object.");
  }
  const { type } = assertionConfig;
  if (typeof type !== "string" || type.trim().length === 0) {
    throw new Error("Structured assert step requires a non-empty `type`.");
  }
  return type;
}

function requireMatchMode(assertionConfig) {
  const mode = assertionConfig.match ?? "includes";
  if (mode !== "includes" && mode !== "equals") {
    throw new Error(`Unsupported assert match mode "${mode}". Supported: includes, equals.`);
  }
  return mode;
}

function requireUrlAssertValue(assertionConfig) {
  if (typeof assertionConfig.value !== "string" || assertionConfig.value.length === 0) {
    throw new Error("`assert.type=url` requires non-empty string `value`.");
  }
}

// exists, visible, hidden and text use the select block's element when they name no selector.
function usesSelectedElement(assertionConfig, selectedElement) {
  return Boolean(selectedElement) && assertionConfig.selector === undefined;
}

function requireAssertSelector(type, assertionConfig) {
  if (typeof assertionConfig.selector !== "string" || assertionConfig.selector.length === 0) {
    throw new Error(`\`assert.type=${type}\` requires \`selector\` when not in a select block.`);
  }
}

function requireJsAssertion(assertionConfig) {
  const hasGlobal = typeof assertionConfig.global === "string" && assertionConfig.global.length > 0;
  const hasFn = typeof assertionConfig.fn === "string" && assertionConfig.fn.length > 0;
  if (hasGlobal === hasFn) {
    throw new Error("`assert.type=js` requires exactly one of `global` or `fn`.");
  }
  if (!Object.prototype.hasOwnProperty.call(assertionConfig, "value")) {
    throw new Error("`assert.type=js` requires `value`.");
  }
  const args = assertionConfig.args ?? [];
  if (!Array.isArray(args)) {
    throw new Error("`assert.type=js` expects `args` to be an array when provided.");
  }
  return { hasGlobal, hasFn, args };
}

// The assert grammar, in the runtime's check order, without the page. Used by compileStep, and by
// runAssertion for every type except url (which reads the URL before checking `match`). Returns
// what the run needs: the timeout, the match mode or the js parts.
export function checkAssertion(assertionConfig, selectedElement) {
  const type = requireAssertType(assertionConfig);
  const onSelectedElement = usesSelectedElement(assertionConfig, selectedElement);
  if (type === "url") {
    requireUrlAssertValue(assertionConfig);
    requireMatchMode(assertionConfig);
    return { type };
  }
  if (type === "exists" || type === "visible" || type === "hidden") {
    const timeout = parseTimeoutValue(assertionConfig.timeoutMs);
    if (!onSelectedElement) {
      requireAssertSelector(type, assertionConfig);
    }
    return { type, onSelectedElement, timeout };
  }
  if (type === "text") {
    if (typeof assertionConfig.value !== "string") {
      throw new Error("`assert.type=text` requires string `value`.");
    }
    const matchMode = requireMatchMode(assertionConfig);
    if (!onSelectedElement) {
      requireAssertSelector(type, assertionConfig);
    }
    return { type, onSelectedElement, matchMode };
  }
  if (type === "js") {
    return { type, ...requireJsAssertion(assertionConfig) };
  }
  throw new Error(
    `Unsupported assert type "${type}". Supported: url, exists, visible, hidden, text, js.`,
  );
}

const URL_ASSERT_POLL_MS = 100;

async function assertUrl(page, assertionConfig) {
  requireUrlAssertValue(assertionConfig);
  let currentUrl = page.url();
  const expected = assertionConfig.value;
  const matchMode = requireMatchMode(assertionConfig);
  const matches = (url) => (matchMode === "equals" ? url === expected : url.includes(expected));
  // Only an explicit positive timeoutMs polls (an SPA can set the URL after async work);
  // without it the URL is read once, as before. A value that is not a number (rejected by
  // validation) also reads it once.
  const timeoutMs = assertionConfig.timeoutMs;
  const pollMs = typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 0;
  const deadline = Date.now() + pollMs;
  while (!matches(currentUrl) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(URL_ASSERT_POLL_MS, deadline - Date.now())));
    currentUrl = page.url();
  }
  if (!matches(currentUrl)) {
    throw new Error(
      `assert url failed: expected "${currentUrl}" to ${matchMode} "${expected}".`,
    );
  }
}

export async function runAssertion(page, assertionConfig, selectedElement, context) {
  if (requireAssertType(assertionConfig) === "url") {
    await assertUrl(page, assertionConfig);
    return;
  }

  const { type, onSelectedElement, timeout, matchMode, hasGlobal, hasFn, args } =
    checkAssertion(assertionConfig, selectedElement);

  if (type === "exists") {
    if (onSelectedElement) {
      const count = await selectedElement.count();
      if (count < 1) {
        throw new Error("assert exists failed: selected element was not found.");
      }
      return;
    }

    const locator = page.locator(assertionConfig.selector);
    if (timeout !== undefined) {
      await locator.first().waitFor({ state: "attached", timeout });
    }
    const count = await locator.count();
    if (count < 1) {
      throw new Error(`assert exists failed: selector "${assertionConfig.selector}" matched 0 elements.`);
    }
    return;
  }

  if (type === "visible" || type === "hidden") {
    const waitOptions = { state: type };
    if (timeout !== undefined) {
      waitOptions.timeout = timeout;
    }

    if (onSelectedElement) {
      await selectedElement.waitFor(waitOptions);
      return;
    }
    await page.waitForSelector(assertionConfig.selector, waitOptions);
    return;
  }

  if (type === "text") {
    const expected = assertionConfig.value;
    const actualText = onSelectedElement
      ? (await selectedElement.textContent()) ?? ""
      : (await page.locator(assertionConfig.selector).first().textContent()) ?? "";
    const ok = matchMode === "equals"
      ? actualText === expected
      : actualText.includes(expected);
    if (!ok) {
      throw new Error(
        `assert text failed: expected "${actualText}" to ${matchMode} "${expected}".`,
      );
    }
    return;
  }

  // The page function keeps its source text (and nesting) exactly: Playwright error messages
  // quote line:column inside it. spec/step-page-functions.spec.js pins it.
  if (type === "js") {
    let actual;
    try {
      actual = await evaluateIn(context, page, "assert js", async ({ globalPath, fnPath, fnArgs }) => {
        const resolvePath = (root, dottedPath) => {
          return dottedPath.split(".").reduce((acc, key) => {
            if (acc === null || acc === undefined) {
              return undefined;
            }
            return acc[key];
          }, root);
        };

        if (globalPath) {
          return resolvePath(window, globalPath);
        }

        const fn = resolvePath(window, fnPath);
        if (typeof fn !== "function") {
          throw new Error(`Expected function at window.${fnPath}.`);
        }
        return await fn(...fnArgs);
      }, {
        globalPath: hasGlobal ? assertionConfig.global : null,
        fnPath: hasFn ? assertionConfig.fn : null,
        fnArgs: args,
      });
    } catch (error) {
      throw new Error(`assert js failed: ${error?.message ?? String(error)}.`, { cause: error });
    }

    if (!deepEqual(actual, assertionConfig.value)) {
      throw new Error(
        `assert js failed: expected ${formatValue(assertionConfig.value)}, got ${formatValue(actual)}.`,
      );
    }
  }
}
