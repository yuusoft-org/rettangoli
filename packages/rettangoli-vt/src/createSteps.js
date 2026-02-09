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

function requireSelectedElement(command, selectedElement) {
  if (!selectedElement) {
    throw new Error(`\`${command}\` requires a \`select\` block target.`);
  }
  return selectedElement;
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

async function assert(page, args, context, selectedElement) {
  const [assertion, ...rest] = args;
  if (!assertion) {
    throw new Error("`assert` requires an assertion type.");
  }

  if (assertion === "url" || assertion === "urlExact") {
    const expected = rest.join(" ");
    if (!expected) {
      throw new Error(`\`assert ${assertion}\` requires an expected URL string.`);
    }
    const currentUrl = page.url();
    if (assertion === "url") {
      if (!currentUrl.includes(expected)) {
        throw new Error(`assert url failed: expected "${currentUrl}" to include "${expected}".`);
      }
      return;
    }
    if (currentUrl !== expected) {
      throw new Error(`assert urlExact failed: expected "${expected}", got "${currentUrl}".`);
    }
    return;
  }

  const { named, positional } = parseNamedArgs(rest);
  const timeout = parseTimeoutValue(named.timeoutMs ?? named.timeout);
  const timeoutOptions = timeout === undefined ? {} : { timeout };

  if (assertion === "exists") {
    if (selectedElement) {
      const count = await selectedElement.count();
      if (count < 1) {
        throw new Error("assert exists failed: selected element was not found.");
      }
      return;
    }
    const selector = named.selector ?? positional[0];
    if (!selector) {
      throw new Error("`assert exists` requires a selector when not in a `select` block.");
    }
    const count = await page.locator(selector).count();
    if (count < 1) {
      throw new Error(`assert exists failed: selector "${selector}" matched 0 elements.`);
    }
    return;
  }

  if (assertion === "visible") {
    if (selectedElement) {
      await selectedElement.waitFor({ state: "visible", ...timeoutOptions });
      return;
    }
    const selector = named.selector ?? positional[0];
    if (!selector) {
      throw new Error("`assert visible` requires a selector when not in a `select` block.");
    }
    await page.waitForSelector(selector, { state: "visible", ...timeoutOptions });
    return;
  }

  if (assertion === "hidden") {
    if (selectedElement) {
      await selectedElement.waitFor({ state: "hidden", ...timeoutOptions });
      return;
    }
    const selector = named.selector ?? positional[0];
    if (!selector) {
      throw new Error("`assert hidden` requires a selector when not in a `select` block.");
    }
    await page.waitForSelector(selector, { state: "hidden", ...timeoutOptions });
    return;
  }

  if (assertion === "text") {
    if (selectedElement) {
      const expected = positional.join(" ");
      if (!expected) {
        throw new Error("`assert text` requires expected text.");
      }
      const actualText = (await selectedElement.textContent()) ?? "";
      if (!actualText.includes(expected)) {
        throw new Error(
          `assert text failed: expected selected element text to include "${expected}", got "${actualText}".`,
        );
      }
      return;
    }
    const selector = named.selector ?? positional[0];
    const expected = positional.slice(1).join(" ");
    if (!selector || !expected) {
      throw new Error(
        "`assert text` requires `<selector> <expected...>` when not in a `select` block.",
      );
    }
    const actualText = (await page.locator(selector).first().textContent()) ?? "";
    if (!actualText.includes(expected)) {
      throw new Error(
        `assert text failed: expected selector "${selector}" text to include "${expected}", got "${actualText}".`,
      );
    }
    return;
  }

  throw new Error(
    `Unsupported assert type "${assertion}". Supported: url, urlExact, exists, visible, hidden, text.`,
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
    assert,
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

  async function executeSingleStep(stepString, selectedElement) {
    const { command, args } = parseStepCommand(stepString);
    if (!command) {
      return;
    }
    const actionFn = actionHandlers[command];
    if (actionFn) {
      await actionFn(page, args, context, selectedElement);
    } else {
      throw new Error(`Unknown step command: "${command}"`);
    }
  }

  return {
    async executeStep(step) {
      if (typeof step === 'string') {
        await executeSingleStep(step, null);
      } else if (typeof step === 'object' && step !== null) {
        const blockCommandString = Object.keys(step)[0];
        const nestedStepStrings = step[blockCommandString];
        const { command, args } = parseStepCommand(blockCommandString);

        const blockFn = actionHandlers[command];
        if (blockFn) {
          const selectedElement = await blockFn(page, args, context, null);
          for (const nestedStep of nestedStepStrings) {
            await executeSingleStep(nestedStep, selectedElement);
          }
        } else {
          throw new Error(`Unsupported block command: "${command}".`);
        }
      }
    }
  };
}
