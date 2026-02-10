function parseStepCommand(stepString) {
  const tokens = stepString.trim().split(/\s+/).filter(Boolean);
  const [command, ...args] = tokens;
  return { command, args };
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
    const key = token.slice(0, separatorIndex);
    const value = token.slice(separatorIndex + 1);
    named[key] = value;
  });
  return { named, positional };
}

function toNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${fieldName}: expected a finite number, got "${value}".`);
  }
  return parsed;
}

function toPositiveInteger(value, fieldName) {
  const parsed = toNumber(value, fieldName);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${fieldName}: expected an integer >= 1, got "${value}".`);
  }
  return parsed;
}

function parseTimeoutValue(value) {
  if (value === undefined) {
    return undefined;
  }
  const timeout = toNumber(value, "timeout");
  if (timeout < 0) {
    throw new Error(`Invalid timeout: expected >= 0, got ${timeout}.`);
  }
  return timeout;
}

function deepEqual(left, right) {
  if (Object.is(left, right)) {
    return true;
  }
  if (typeof left !== typeof right) {
    return false;
  }
  if (left === null || right === null) {
    return left === right;
  }
  if (typeof left !== "object") {
    return left === right;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    if (left.length !== right.length) {
      return false;
    }
    for (let index = 0; index < left.length; index += 1) {
      if (!deepEqual(left[index], right[index])) {
        return false;
      }
    }
    return true;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) {
      return false;
    }
    if (!deepEqual(left[key], right[key])) {
      return false;
    }
  }
  return true;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function requireSelectedElement(command, selectedElement) {
  if (!selectedElement) {
    throw new Error(`\`${command}\` requires a \`select\` block target.`);
  }
  return selectedElement;
}

const WAIT_FOR_STATES = new Set(["attached", "detached", "visible", "hidden"]);

const STRUCTURED_ACTIONS = new Set([
  "assert",
  "blur",
  "check",
  "clear",
  "click",
  "customEvent",
  "dblclick",
  "focus",
  "goto",
  "hover",
  "keypress",
  "mouseDown",
  "mouseUp",
  "move",
  "rclick",
  "rightMouseDown",
  "rightMouseUp",
  "scroll",
  "select",
  "selectOption",
  "setViewport",
  "screenshot",
  "uncheck",
  "upload",
  "wait",
  "waitFor",
  "write",
]);

function assertStructuredKeys(stepObject, allowedKeys, actionName) {
  const unknownKeys = Object.keys(stepObject).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(
      `Structured action "${actionName}" has unknown keys: ${unknownKeys.join(", ")}.`,
    );
  }
}

function requireStepAction(stepObject) {
  if (!isPlainObject(stepObject)) {
    throw new Error("Invalid step: expected string or object.");
  }
  if (typeof stepObject.action !== "string" || stepObject.action.trim().length === 0) {
    throw new Error("Structured step requires non-empty string `action`.");
  }
  const action = stepObject.action.trim();
  if (!STRUCTURED_ACTIONS.has(action)) {
    throw new Error(`Unknown structured action: "${action}".`);
  }
  return action;
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

function optionalStructuredNumber(stepObject, key, actionName) {
  if (!Object.prototype.hasOwnProperty.call(stepObject, key)) {
    return undefined;
  }
  return requireStructuredNumber(stepObject, key, actionName);
}

function requireCoordinatesPair(stepObject, actionName) {
  const hasX = Object.prototype.hasOwnProperty.call(stepObject, "x");
  const hasY = Object.prototype.hasOwnProperty.call(stepObject, "y");
  if (hasX !== hasY) {
    throw new Error(`Structured action "${actionName}" requires both \`x\` and \`y\` together.`);
  }
  if (!hasX) {
    return [];
  }
  const x = requireStructuredNumber(stepObject, "x", actionName);
  const y = requireStructuredNumber(stepObject, "y", actionName);
  return [String(x), String(y)];
}

function normalizeStructuredActionStep(stepObject) {
  const action = requireStepAction(stepObject);

  if (action === "assert") {
    assertStructuredKeys(
      stepObject,
      new Set(["action", "type", "match", "selector", "timeoutMs", "value", "global", "fn", "args"]),
      action,
    );
    const assertionConfig = { ...stepObject };
    delete assertionConfig.action;
    return { kind: "assert", assertionConfig };
  }

  if (action === "select") {
    assertStructuredKeys(stepObject, new Set(["action", "testId", "steps"]), action);
    const testId = requireStructuredString(stepObject, "testId", action);
    if (!Array.isArray(stepObject.steps)) {
      throw new Error('Structured action "select" requires array `steps`.');
    }
    const nestedSteps = stepObject.steps.map((nestedStep) => normalizeStepValue(nestedStep));
    return { kind: "block", command: "select", args: [testId], nestedSteps };
  }

  if (action === "click" || action === "dblclick" || action === "hover" || action === "rclick") {
    assertStructuredKeys(stepObject, new Set(["action", "x", "y"]), action);
    return { kind: "command", command: action, args: requireCoordinatesPair(stepObject, action) };
  }

  if (action === "move") {
    assertStructuredKeys(stepObject, new Set(["action", "x", "y"]), action);
    const x = requireStructuredNumber(stepObject, "x", action);
    const y = requireStructuredNumber(stepObject, "y", action);
    return { kind: "command", command: action, args: [String(x), String(y)] };
  }

  if (action === "scroll") {
    assertStructuredKeys(stepObject, new Set(["action", "deltaX", "deltaY"]), action);
    const deltaX = requireStructuredNumber(stepObject, "deltaX", action);
    const deltaY = requireStructuredNumber(stepObject, "deltaY", action);
    return { kind: "command", command: action, args: [String(deltaX), String(deltaY)] };
  }

  if (action === "goto") {
    assertStructuredKeys(stepObject, new Set(["action", "url"]), action);
    return { kind: "command", command: action, args: [requireStructuredString(stepObject, "url", action)] };
  }

  if (action === "keypress") {
    assertStructuredKeys(stepObject, new Set(["action", "key"]), action);
    return { kind: "command", command: action, args: [requireStructuredString(stepObject, "key", action)] };
  }

  if (action === "wait") {
    assertStructuredKeys(stepObject, new Set(["action", "ms"]), action);
    const ms = requireStructuredNumber(stepObject, "ms", action);
    return { kind: "command", command: action, args: [String(ms)] };
  }

  if (action === "setViewport") {
    assertStructuredKeys(stepObject, new Set(["action", "width", "height"]), action);
    const width = requireStructuredNumber(stepObject, "width", action);
    const height = requireStructuredNumber(stepObject, "height", action);
    return { kind: "command", command: action, args: [String(width), String(height)] };
  }

  if (action === "write") {
    assertStructuredKeys(stepObject, new Set(["action", "value"]), action);
    const value = stepObject.value;
    if (typeof value !== "string") {
      throw new Error('Structured action "write" requires string `value`.');
    }
    return { kind: "command", command: action, args: [value] };
  }

  if (action === "upload") {
    assertStructuredKeys(stepObject, new Set(["action", "files"]), action);
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
    return { kind: "command", command: action, args: [...stepObject.files] };
  }

  if (action === "waitFor") {
    assertStructuredKeys(stepObject, new Set(["action", "selector", "state", "timeoutMs"]), action);
    const args = [];
    if (Object.prototype.hasOwnProperty.call(stepObject, "selector")) {
      const selector = requireStructuredString(stepObject, "selector", action);
      args.push(`selector=${selector}`);
    }
    if (Object.prototype.hasOwnProperty.call(stepObject, "state")) {
      const state = requireStructuredString(stepObject, "state", action);
      if (!WAIT_FOR_STATES.has(state)) {
        throw new Error(
          `Structured action "waitFor" has invalid state "${state}". Supported: attached, detached, visible, hidden.`,
        );
      }
      args.push(`state=${state}`);
    }
    const timeoutMs = optionalStructuredNumber(stepObject, "timeoutMs", action);
    if (timeoutMs !== undefined) {
      args.push(`timeoutMs=${timeoutMs}`);
    }
    return { kind: "command", command: action, args };
  }

  if (action === "selectOption") {
    assertStructuredKeys(stepObject, new Set(["action", "value", "label", "index"]), action);
    const hasValue = Object.prototype.hasOwnProperty.call(stepObject, "value");
    const hasLabel = Object.prototype.hasOwnProperty.call(stepObject, "label");
    const hasIndex = Object.prototype.hasOwnProperty.call(stepObject, "index");
    const setCount = [hasValue, hasLabel, hasIndex].filter(Boolean).length;

    if (setCount !== 1) {
      throw new Error(
        'Structured action "selectOption" requires exactly one of `value`, `label`, or `index`.',
      );
    }

    if (hasValue) {
      return {
        kind: "command",
        command: action,
        args: [`value=${requireStructuredString(stepObject, "value", action)}`],
      };
    }
    if (hasLabel) {
      return {
        kind: "command",
        command: action,
        args: [`label=${requireStructuredString(stepObject, "label", action)}`],
      };
    }
    return {
      kind: "command",
      command: action,
      args: [`index=${requireStructuredNumber(stepObject, "index", action)}`],
    };
  }

  if (action === "customEvent") {
    assertStructuredKeys(stepObject, new Set(["action", "name", "detail"]), action);
    const eventName = requireStructuredString(stepObject, "name", action);
    const args = [eventName];
    if (stepObject.detail !== undefined) {
      if (!isPlainObject(stepObject.detail)) {
        throw new Error('Structured action "customEvent" requires object `detail` when provided.');
      }
      Object.entries(stepObject.detail).forEach(([key, value]) => {
        const formattedValue = typeof value === "string" ? value : JSON.stringify(value);
        args.push(`${key}=${formattedValue}`);
      });
    }
    return { kind: "command", command: action, args };
  }

  if (
    action === "blur"
    || action === "check"
    || action === "clear"
    || action === "focus"
    || action === "mouseDown"
    || action === "mouseUp"
    || action === "rightMouseDown"
    || action === "rightMouseUp"
    || action === "screenshot"
    || action === "uncheck"
  ) {
    assertStructuredKeys(stepObject, new Set(["action"]), action);
    return { kind: "command", command: action, args: [] };
  }

  throw new Error(`Unknown structured action: "${action}".`);
}

function normalizeLegacyBlockStep(stepObject) {
  const keys = Object.keys(stepObject);
  if (keys.length !== 1) {
    throw new Error(`Step object must have exactly one key, got ${keys.length}.`);
  }
  const [key] = keys;
  if (key === "assert") {
    return { kind: "assert", assertionConfig: stepObject.assert };
  }

  const nestedStepValues = stepObject[key];
  if (!Array.isArray(nestedStepValues)) {
    throw new Error(`Block step "${key}" must contain an array of nested steps.`);
  }
  const { command, args } = parseStepCommand(key);
  const nestedSteps = nestedStepValues.map((nestedStep) => normalizeStepValue(nestedStep));
  return { kind: "block", command, args, nestedSteps };
}

function normalizeStepValue(step) {
  if (typeof step === "string") {
    const { command, args } = parseStepCommand(step);
    return { kind: "command", command, args };
  }
  if (!isPlainObject(step)) {
    throw new Error("Invalid step: expected string or object.");
  }
  if (Object.prototype.hasOwnProperty.call(step, "action")) {
    return normalizeStructuredActionStep(step);
  }
  return normalizeLegacyBlockStep(step);
}

async function click(page, args, context, selectedElement) {
  if (selectedElement) {
    await selectedElement.click();
  } else if (args.length >= 2) {
    await page.mouse.click(
      toNumber(args[0], "x"),
      toNumber(args[1], "y"),
      { button: "left" },
    );
  } else {
    throw new Error("`click` requires a `select` block target or `x y` coordinates.");
  }
}

async function customEvent(page, args) {
  if (args.length === 0) {
    throw new Error("`customEvent` requires an event name.");
  }
  const [eventName, ...params] = args;
  const payload = {};
  params.forEach((param) => {
    const [key, value] = param.split("=");
    if (!key || value === undefined) {
      throw new Error(
        `Invalid customEvent argument "${param}". Expected key=value.`,
      );
    }
    payload[key] = value;
  });
  await page.evaluate(({ eventName, payload }) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  }, { eventName, payload });
}

async function goto(page, args) {
  if (!args[0]) {
    throw new Error("`goto` requires a URL argument.");
  }
  await page.goto(args[0], { waitUntil: "networkidle" });
  // Normalize font rendering for consistent screenshots
  await page.addStyleTag({
    content: `
      * {
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        text-rendering: geometricPrecision !important;
      }
    `
  });
}

async function keypress(page, args) {
  if (!args[0]) {
    throw new Error("`keypress` requires a key argument.");
  }
  await page.keyboard.press(args[0]);
}

async function mouseDown(page) {
  await page.mouse.down();
}

async function mouseUp(page) {
  await page.mouse.up();
}

async function rightMouseDown(page) {
  await page.mouse.down({ button: 'right' });
}

async function rightMouseUp(page) {
  await page.mouse.up({ button: 'right' });
}

async function move(page, args) {
  if (args.length < 2) {
    throw new Error("`move` requires `x y` coordinates.");
  }
  await page.mouse.move(toNumber(args[0], "x"), toNumber(args[1], "y"));
}

async function scroll(page, args) {
  if (args.length < 2) {
    throw new Error("`scroll` requires `deltaX deltaY` values.");
  }
  await page.mouse.wheel(toNumber(args[0], "deltaX"), toNumber(args[1], "deltaY"));
}

async function rclick(page, args, context, selectedElement) {
  if (selectedElement) {
    await selectedElement.click({ button: "right" });
  } else if (args.length >= 2) {
    await page.mouse.click(
      toNumber(args[0], "x"),
      toNumber(args[1], "y"),
      { button: "right" },
    );
  } else {
    throw new Error("`rclick` requires a `select` block target or `x y` coordinates.");
  }
}

async function wait(page, args) {
  if (!args[0]) {
    throw new Error("`wait` requires a millisecond duration.");
  }
  await page.waitForTimeout(toNumber(args[0], "ms"));
}

async function setViewport(page, args) {
  if (args.length < 2) {
    throw new Error("`setViewport` requires `width height`.");
  }
  await page.setViewportSize({
    width: toPositiveInteger(args[0], "width"),
    height: toPositiveInteger(args[1], "height"),
  });
}

async function write(page, args, context, selectedElement) {
  const target = requireSelectedElement("write", selectedElement);
  const textToWrite = args.join(" ");
  await target.fill(textToWrite);
}

async function hover(page, args, context, selectedElement) {
  if (selectedElement) {
    await selectedElement.hover();
    return;
  }
  if (args.length >= 2) {
    await page.mouse.move(toNumber(args[0], "x"), toNumber(args[1], "y"));
    return;
  }
  throw new Error("`hover` requires a `select` block target or `x y` coordinates.");
}

async function dblclick(page, args, context, selectedElement) {
  if (selectedElement) {
    await selectedElement.dblclick();
    return;
  }
  if (args.length >= 2) {
    await page.mouse.dblclick(toNumber(args[0], "x"), toNumber(args[1], "y"));
    return;
  }
  throw new Error("`dblclick` requires a `select` block target or `x y` coordinates.");
}

async function focus(page, args, context, selectedElement) {
  const target = requireSelectedElement("focus", selectedElement);
  await target.focus();
}

async function blur(page, args, context, selectedElement) {
  const target = requireSelectedElement("blur", selectedElement);
  await target.evaluate((element) => element.blur());
}

async function clear(page, args, context, selectedElement) {
  const target = requireSelectedElement("clear", selectedElement);
  await target.fill("");
}

async function check(page, args, context, selectedElement) {
  const target = requireSelectedElement("check", selectedElement);
  await target.check();
}

async function uncheck(page, args, context, selectedElement) {
  const target = requireSelectedElement("uncheck", selectedElement);
  await target.uncheck();
}

async function selectOption(page, args, context, selectedElement) {
  const target = requireSelectedElement("selectOption", selectedElement);
  const { named, positional } = parseNamedArgs(args);

  const hasNamed =
    named.value !== undefined
    || named.label !== undefined
    || named.index !== undefined;

  if (hasNamed) {
    const option = {};
    if (named.value !== undefined) {
      option.value = named.value;
    }
    if (named.label !== undefined) {
      option.label = named.label;
    }
    if (named.index !== undefined) {
      option.index = toNumber(named.index, "index");
    }
    await target.selectOption(option);
    return;
  }

  if (positional.length === 0) {
    throw new Error(
      "`selectOption` requires an option value/label or key=value args (value=, label=, index=).",
    );
  }
  await target.selectOption(positional[0]);
}

async function upload(page, args, context, selectedElement) {
  const target = requireSelectedElement("upload", selectedElement);
  const files = args.filter((token) => token.length > 0);
  if (files.length === 0) {
    throw new Error("`upload` requires one or more file paths.");
  }
  await target.setInputFiles(files);
}

async function waitFor(page, args, context, selectedElement) {
  const { named, positional } = parseNamedArgs(args);
  const state = named.state ?? positional[1] ?? "visible";
  const timeout = parseTimeoutValue(named.timeoutMs ?? named.timeout ?? positional[2]);
  const waitOptions = { state };
  if (timeout !== undefined) {
    waitOptions.timeout = timeout;
  }

  if (selectedElement) {
    await selectedElement.waitFor(waitOptions);
    return;
  }

  const selector = named.selector ?? positional[0];
  if (!selector) {
    throw new Error(
      "`waitFor` requires a selector (or a selected element in a `select` block).",
    );
  }
  await page.waitForSelector(selector, waitOptions);
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

function requireMatchMode(assertionConfig, defaultMode = "includes") {
  const mode = assertionConfig.match ?? defaultMode;
  if (mode !== "includes" && mode !== "equals") {
    throw new Error(`Unsupported assert match mode "${mode}". Supported: includes, equals.`);
  }
  return mode;
}

async function assertStructured(page, assertionConfig, selectedElement) {
  const type = requireAssertType(assertionConfig);

  if (type === "url") {
    if (typeof assertionConfig.value !== "string" || assertionConfig.value.length === 0) {
      throw new Error("`assert.type=url` requires non-empty string `value`.");
    }
    const currentUrl = page.url();
    const expected = assertionConfig.value;
    const matchMode = requireMatchMode(assertionConfig);
    const ok = matchMode === "equals"
      ? currentUrl === expected
      : currentUrl.includes(expected);
    if (!ok) {
      throw new Error(
        `assert url failed: expected "${currentUrl}" to ${matchMode} "${expected}".`,
      );
    }
    return;
  }

  if (type === "exists") {
    const timeout = parseTimeoutValue(assertionConfig.timeoutMs);
    if (selectedElement && assertionConfig.selector === undefined) {
      const count = await selectedElement.count();
      if (count < 1) {
        throw new Error("assert exists failed: selected element was not found.");
      }
      return;
    }

    if (typeof assertionConfig.selector !== "string" || assertionConfig.selector.length === 0) {
      throw new Error("`assert.type=exists` requires `selector` when not in a select block.");
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
    const timeout = parseTimeoutValue(assertionConfig.timeoutMs);
    const waitOptions = { state: type };
    if (timeout !== undefined) {
      waitOptions.timeout = timeout;
    }

    if (selectedElement && assertionConfig.selector === undefined) {
      await selectedElement.waitFor(waitOptions);
      return;
    }

    if (typeof assertionConfig.selector !== "string" || assertionConfig.selector.length === 0) {
      throw new Error(`\`assert.type=${type}\` requires \`selector\` when not in a select block.`);
    }

    await page.waitForSelector(assertionConfig.selector, waitOptions);
    return;
  }

  if (type === "text") {
    const expected = assertionConfig.value;
    if (typeof expected !== "string") {
      throw new Error("`assert.type=text` requires string `value`.");
    }
    const matchMode = requireMatchMode(assertionConfig);

    let actualText = "";
    if (selectedElement && assertionConfig.selector === undefined) {
      actualText = (await selectedElement.textContent()) ?? "";
    } else {
      if (typeof assertionConfig.selector !== "string" || assertionConfig.selector.length === 0) {
        throw new Error("`assert.type=text` requires `selector` when not in a select block.");
      }
      actualText = (await page.locator(assertionConfig.selector).first().textContent()) ?? "";
    }

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

  if (type === "js") {
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

    let actual;
    try {
      actual = await page.evaluate(async ({ globalPath, fnPath, fnArgs }) => {
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
      throw new Error(`assert js failed: ${error?.message ?? String(error)}.`);
    }

    if (!deepEqual(actual, assertionConfig.value)) {
      throw new Error(
        `assert js failed: expected ${formatValue(assertionConfig.value)}, got ${formatValue(actual)}.`,
      );
    }
    return;
  }

  throw new Error(
    `Unsupported assert type "${type}". Supported: url, exists, visible, hidden, text, js.`,
  );
}

async function select(page, args) {
  const testId = args[0];
  if (!testId) {
    throw new Error("`select` requires a test id.");
  }
  const hostElementLocator = page.getByTestId(testId);
  
  const interactiveElementLocator = hostElementLocator.locator(
    'input, textarea, button, select, a'
  ).first();
  
  const count = await interactiveElementLocator.count();
  
  if (count > 0) {
    return interactiveElementLocator;
  }
  
  return hostElementLocator;
}

export function createSteps(page, context) {
  async function screenshot() {
    const screenshotPath = await context.takeAndSaveScreenshot(page, context.baseName);
    console.log(`Screenshot saved: ${screenshotPath}`);
  }

  const actionHandlers = {
    blur,
    check,
    clear,
    click,
    customEvent,
    dblclick,
    focus,
    goto,
    hover,
    keypress,
    mouseDown,
    mouseUp,
    move,
    rclick,
    rightMouseDown,
    rightMouseUp,
    scroll,
    setViewport,
    screenshot,
    select,
    selectOption,
    uncheck,
    upload,
    wait,
    waitFor,
    write,
  };

  async function executeCommand(command, args, selectedElement) {
    if (!command) {
      return;
    }
    if (command === "assert") {
      throw new Error(
        "Inline `assert` step strings are no longer supported. Use structured syntax: `- assert: { type: ..., ... }`.",
      );
    }
    const actionFn = actionHandlers[command];
    if (actionFn) {
      await actionFn(page, args, context, selectedElement);
    } else {
      throw new Error(`Unknown step command: "${command}"`);
    }
  }

  async function executeNormalizedStep(normalizedStep, selectedElement) {
    if (normalizedStep.kind === "assert") {
      await assertStructured(page, normalizedStep.assertionConfig, selectedElement);
      return;
    }

    if (normalizedStep.kind === "block") {
      const { command, args, nestedSteps } = normalizedStep;
      const blockFn = actionHandlers[command];
      if (!blockFn) {
        throw new Error(`Unsupported block command: "${command}".`);
      }
      const blockSelectedElement = await blockFn(page, args, context, null);
      for (const nestedStep of nestedSteps) {
        await executeNormalizedStep(nestedStep, blockSelectedElement);
      }
      return;
    }

    await executeCommand(normalizedStep.command, normalizedStep.args, selectedElement);
  }

  async function executeStepValue(step, selectedElement) {
    const normalizedStep = normalizeStepValue(step);
    await executeNormalizedStep(normalizedStep, selectedElement);
  }

  return {
    async executeStep(step) {
      await executeStepValue(step, null);
    }
  };
}
