// The step actions (every structured action except `assert`). Each entry has:
// - keys: the structured keys it accepts besides `action`;
// - normalize(step, name) -> params: reads a structured step (throws while normalizing);
// - legacy(args) -> params: parses a legacy block's tokens, when the block runs;
// - target: "select" when it needs a select block's element (legacy blocks never have one,
//   so these need no legacy parser);
// - check(params, target): what it throws before touching the page (shared with compileStep);
// - run(page, params, context, target): the page calls. Only select returns a value: the element
//   its nested steps act on. Parameter names (`target`, `selectedElement`) show up in V8 TypeError
//   messages when an odd value reaches them, so keep them stable (JSC also quotes the arguments).
import { evaluateIn, isPlainObject, parseTimeoutValue, toNumber, toPositiveInteger } from "./shared.js";

const WAIT_FOR_STATES = new Set(["attached", "detached", "visible", "hidden"]);

// Normalizes font rendering for consistent screenshots. The exact text is part of the step goldens.
const FONT_SMOOTHING_CSS = `
      * {
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        text-rendering: geometricPrecision !important;
      }
    `;

export function requireSelectedElement(command, selectedElement) {
  if (!selectedElement) {
    throw new Error(`\`${command}\` requires a \`select\` block target.`);
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function requireStructuredString(stepObject, key, actionName) {
  const value = stepObject[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Structured action "${actionName}" requires non-empty string \`${key}\`.`);
  }
  return value;
}

function requireStructuredNumber(stepObject, key, actionName) {
  const value = stepObject[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Structured action "${actionName}" requires finite number \`${key}\`.`);
  }
  return value;
}

// normalize for actions whose keys are all required numbers, read in order.
function numbers(...keys) {
  return (stepObject, actionName) => Object.fromEntries(
    keys.map((key) => [key, requireStructuredNumber(stepObject, key, actionName)]),
  );
}

function parseNamedArgs(args) {
  const named = {};
  const positional = [];
  args.forEach((token) => {
    const separatorIndex = token.indexOf("=");
    if (separatorIndex <= 0) {
      positional.push(token);
      return;
    }
    named[token.slice(0, separatorIndex)] = token.slice(separatorIndex + 1);
  });
  return { named, positional };
}

function requireFirstArg(args, message) {
  if (!args[0]) {
    throw new Error(message);
  }
  return args[0];
}

// legacy for `move` and `scroll`: two numbers.
function legacyPair(args, keys, message) {
  if (args.length < 2) {
    throw new Error(message);
  }
  return { [keys[0]]: toNumber(args[0], keys[0]), [keys[1]]: toNumber(args[1], keys[1]) };
}

// click, dblclick, hover and rclick act on the select block's element, else at `x y`.
function pointerAction(name, onElement, onPage) {
  return {
    keys: ["x", "y"],
    normalize(stepObject) {
      const hasX = hasOwn(stepObject, "x");
      if (hasX !== hasOwn(stepObject, "y")) {
        throw new Error(`Structured action "${name}" requires both \`x\` and \`y\` together.`);
      }
      return hasX ? numbers("x", "y")(stepObject, name) : {};
    },
    legacy: (args) => (args.length < 2 ? {} : { x: toNumber(args[0], "x"), y: toNumber(args[1], "y") }),
    check(params, selectedElement) {
      if (!selectedElement && params.x === undefined) {
        throw new Error(`\`${name}\` requires a \`select\` block target or \`x y\` coordinates.`);
      }
    },
    async run(page, { x, y }, context, selectedElement) {
      await (selectedElement ? onElement(selectedElement) : onPage(page, x, y));
    },
  };
}

// blur, check, clear, focus and uncheck: no keys, act on the select block's element.
function elementAction(call) {
  return {
    target: "select",
    async run(page, params, context, target) {
      await call(target, context);
    },
  };
}

// No keys, no arguments.
function pageAction(call) {
  return {
    async run(page) {
      await call(page);
    },
  };
}

// A URL that parses, or starts with "localhost" or "127.0.0.1", is passed through unchanged. A
// relative URL resolves against the current page when that is an http(s) or file page; otherwise
// it is passed raw and page.goto reports it.
function resolveGotoUrl(page, rawUrl) {
  if (rawUrl.startsWith("localhost") || rawUrl.startsWith("127.0.0.1")) {
    return rawUrl;
  }
  try {
    new URL(rawUrl);
    return rawUrl;
  } catch {
    // Relative URL.
  }
  try {
    const currentUrl = new URL(page.url());
    if (["http:", "https:", "file:"].includes(currentUrl.protocol)) {
      return new URL(rawUrl, currentUrl).href;
    }
  } catch {
    // No usable current URL.
  }
  return rawUrl;
}

function invalidCustomEventArgument(text) {
  return new Error(`Invalid customEvent argument "${text}". Expected key=value.`);
}

// The functions passed to evaluate (this one, blur's and assert js's) run in the page. Keep their
// source text exactly, indentation included: Playwright error messages quote line:column inside
// them. spec/step-page-functions.spec.js pins them.
async function dispatchCustomEvent(page, { eventName, detail: payload }, context) {
  await evaluateIn(context, page, `customEvent "${eventName}"`, ({ eventName, payload }) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  }, { eventName, payload });
}

export const ACTIONS = {
  blur: elementAction((target, context) => evaluateIn(context, target, "blur", (element) => element.blur())),
  check: elementAction((target) => target.check()),
  clear: elementAction((target) => target.fill("")),
  click: pointerAction(
    "click",
    (selectedElement) => selectedElement.click(),
    (page, x, y) => page.mouse.click(x, y, { button: "left" }),
  ),
  customEvent: {
    keys: ["name", "detail"],
    normalize(stepObject, name) {
      const eventName = requireStructuredString(stepObject, "name", name);
      if (stepObject.detail === undefined) {
        return { eventName, detail: {} };
      }
      if (!isPlainObject(stepObject.detail)) {
        throw new Error('Structured action "customEvent" requires object `detail` when provided.');
      }
      // Every value arrives as a string; non-strings are JSON-encoded.
      const detail = {};
      Object.entries(stepObject.detail).forEach(([key, value]) => {
        detail[key] = typeof value === "string" ? value : `${JSON.stringify(value)}`;
      });
      return { eventName, detail };
    },
    legacy(args) {
      if (args.length === 0) {
        throw new Error("`customEvent` requires an event name.");
      }
      const [eventName, ...params] = args;
      // "key=value" tokens, split at the first "=".
      const detail = {};
      params.forEach((param) => {
        const separatorIndex = param.indexOf("=");
        if (separatorIndex <= 0) {
          throw invalidCustomEventArgument(param);
        }
        detail[param.slice(0, separatorIndex)] = param.slice(separatorIndex + 1);
      });
      return { eventName, detail };
    },
    check({ detail }) {
      Object.entries(detail).forEach(([key, value]) => {
        if (!key) {
          throw invalidCustomEventArgument(`=${value}`);
        }
      });
    },
    run: dispatchCustomEvent,
  },
  dblclick: pointerAction(
    "dblclick",
    (selectedElement) => selectedElement.dblclick(),
    (page, x, y) => page.mouse.dblclick(x, y),
  ),
  focus: elementAction((target) => target.focus()),
  goto: {
    keys: ["url"],
    normalize: (stepObject, name) => ({ url: requireStructuredString(stepObject, "url", name) }),
    legacy: (args) => ({ url: requireFirstArg(args, "`goto` requires a URL argument.") }),
    async run(page, { url }) {
      await page.goto(resolveGotoUrl(page, url), { waitUntil: "networkidle" });
      await page.addStyleTag({ content: FONT_SMOOTHING_CSS });
    },
  },
  hover: pointerAction(
    "hover",
    (selectedElement) => selectedElement.hover(),
    (page, x, y) => page.mouse.move(x, y),
  ),
  keypress: {
    keys: ["key"],
    normalize: (stepObject, name) => ({ key: requireStructuredString(stepObject, "key", name) }),
    legacy: (args) => ({ key: requireFirstArg(args, "`keypress` requires a key argument.") }),
    async run(page, { key }) {
      await page.keyboard.press(key);
    },
  },
  mouseDown: pageAction((page) => page.mouse.down()),
  mouseUp: pageAction((page) => page.mouse.up()),
  move: {
    keys: ["x", "y"],
    normalize: numbers("x", "y"),
    legacy: (args) => legacyPair(args, ["x", "y"], "`move` requires `x y` coordinates."),
    async run(page, { x, y }) {
      await page.mouse.move(x, y);
    },
  },
  rclick: pointerAction(
    "rclick",
    (selectedElement) => selectedElement.click({ button: "right" }),
    (page, x, y) => page.mouse.click(x, y, { button: "right" }),
  ),
  rightMouseDown: pageAction((page) => page.mouse.down({ button: "right" })),
  rightMouseUp: pageAction((page) => page.mouse.up({ button: "right" })),
  screenshot: {
    async run(page, params, context) {
      const screenshotPath = await context.takeAndSaveScreenshot(page, context.baseName);
      console.log(`Screenshot saved: ${screenshotPath}`);
    },
  },
  scroll: {
    keys: ["deltaX", "deltaY"],
    normalize: numbers("deltaX", "deltaY"),
    legacy: (args) => legacyPair(args, ["deltaX", "deltaY"], "`scroll` requires `deltaX deltaY` values."),
    async run(page, { deltaX, deltaY }) {
      await page.mouse.wheel(deltaX, deltaY);
    },
  },
  // Returns the element its nested steps act on: the host's first interactive descendant, or the
  // host itself.
  select: {
    keys: ["testId", "selector", "steps"],
    normalize(stepObject, name) {
      if (hasOwn(stepObject, "testId") === hasOwn(stepObject, "selector")) {
        throw new Error(`Structured action "${name}" requires exactly one of \`testId\` or \`selector\`.`);
      }
      const params = hasOwn(stepObject, "testId")
        ? { testId: requireStructuredString(stepObject, "testId", name) }
        : { selector: requireStructuredString(stepObject, "selector", name) };
      if (!Array.isArray(stepObject.steps)) {
        throw new Error('Structured action "select" requires array `steps`.');
      }
      return params;
    },
    legacy(args) {
      const { named, positional } = parseNamedArgs(args);
      // `select <testId>`, `select testId=<id>` or `select selector=<css>`.
      const testId = named.testId || positional[0];
      const selector = named.selector || undefined;
      if ((testId ? 1 : 0) + (selector ? 1 : 0) !== 1) {
        throw new Error("`select` requires exactly one target: `testId` or `selector`.");
      }
      return { testId, selector };
    },
    async run(page, { testId, selector }) {
      const hostElementLocator = selector ? page.locator(selector) : page.getByTestId(testId);
      const interactiveElementLocator = hostElementLocator.locator("input, textarea, button, select, a").first();
      const count = await interactiveElementLocator.count();
      return count > 0 ? interactiveElementLocator : hostElementLocator;
    },
  },
  selectOption: {
    keys: ["value", "label", "index"],
    target: "select",
    normalize(stepObject, name) {
      const present = ["value", "label", "index"].filter((key) => hasOwn(stepObject, key));
      if (present.length !== 1) {
        throw new Error(
          'Structured action "selectOption" requires exactly one of `value`, `label`, or `index`.',
        );
      }
      const [key] = present;
      return {
        option: {
          [key]: key === "index"
            ? requireStructuredNumber(stepObject, key, name)
            : requireStructuredString(stepObject, key, name),
        },
      };
    },
    async run(page, { option }, context, target) {
      await target.selectOption(option);
    },
  },
  setViewport: {
    keys: ["width", "height"],
    normalize: numbers("width", "height"),
    legacy(args) {
      if (args.length < 2) {
        throw new Error("`setViewport` requires `width height`.");
      }
      return { width: toPositiveInteger(args[0], "width"), height: toPositiveInteger(args[1], "height") };
    },
    check({ width, height }) {
      toPositiveInteger(width, "width");
      toPositiveInteger(height, "height");
    },
    async run(page, { width, height }) {
      await page.setViewportSize({ width, height });
    },
  },
  uncheck: elementAction((target) => target.uncheck()),
  upload: {
    keys: ["files"],
    target: "select",
    normalize(stepObject) {
      if (!Array.isArray(stepObject.files) || stepObject.files.length === 0) {
        throw new Error('Structured action "upload" requires non-empty array `files`.');
      }
      stepObject.files.forEach((filePath, index) => {
        if (typeof filePath !== "string" || filePath.length === 0) {
          throw new Error(
            `Structured action "upload" requires each file path to be a non-empty string (index ${index}).`,
          );
        }
      });
      return { files: [...stepObject.files] };
    },
    async run(page, { files }, context, target) {
      await target.setInputFiles(files);
    },
  },
  wait: {
    keys: ["ms"],
    normalize: numbers("ms"),
    legacy: (args) => ({ ms: toNumber(requireFirstArg(args, "`wait` requires a millisecond duration."), "ms") }),
    async run(page, { ms }) {
      await page.waitForTimeout(ms);
    },
  },
  waitFor: {
    keys: ["selector", "state", "timeoutMs"],
    normalize(stepObject, name) {
      const params = { selector: undefined, state: "visible", timeout: undefined };
      if (hasOwn(stepObject, "selector")) {
        params.selector = requireStructuredString(stepObject, "selector", name);
      }
      if (hasOwn(stepObject, "state")) {
        params.state = requireStructuredString(stepObject, "state", name);
        if (!WAIT_FOR_STATES.has(params.state)) {
          throw new Error(
            `Structured action "waitFor" has invalid state "${params.state}". Supported: attached, detached, visible, hidden.`,
          );
        }
      }
      if (hasOwn(stepObject, "timeoutMs")) {
        params.timeout = requireStructuredNumber(stepObject, "timeoutMs", name);
      }
      return params;
    },
    // Positional form: `waitFor <selector> <state> <timeoutMs>`.
    legacy(args) {
      const { named, positional } = parseNamedArgs(args);
      return {
        state: named.state ?? positional[1] ?? "visible",
        timeout: parseTimeoutValue(named.timeoutMs ?? named.timeout ?? positional[2]),
        selector: named.selector ?? positional[0],
      };
    },
    check({ selector, timeout }, selectedElement) {
      parseTimeoutValue(timeout);
      if (!selectedElement && !selector) {
        throw new Error(
          "`waitFor` requires a selector (or a selected element in a `select` block).",
        );
      }
    },
    async run(page, { selector, state, timeout }, context, selectedElement) {
      const waitOptions = { state };
      if (timeout !== undefined) {
        waitOptions.timeout = timeout;
      }

      if (selectedElement) {
        await selectedElement.waitFor(waitOptions);
        return;
      }
      await page.waitForSelector(selector, waitOptions);
    },
  },
  write: {
    keys: ["value"],
    target: "select",
    normalize(stepObject) {
      if (typeof stepObject.value !== "string") {
        throw new Error('Structured action "write" requires string `value`.');
      }
      return { value: stepObject.value };
    },
    async run(page, { value }, context, target) {
      await target.fill(value);
    },
  },
};
