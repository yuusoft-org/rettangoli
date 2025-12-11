async function click(page, args, context, selectedElement) {
  if (selectedElement) {
    await selectedElement.click();
  } else if (args.length >= 2) {
    await page.mouse.click(Number(args[0]), Number(args[1]), { button: "left" });
  } else {
    console.warn('`click` command needs a `select` block or coordinates.');
  }
}

async function customEvent(page, args) {
  const [eventName, ...params] = args;
  const payload = {};
  params.forEach(param => {
    const [key, value] = param.split('=');
    payload[key] = value;
  });
  await page.evaluate(({ eventName, payload }) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  }, { eventName, payload });
}

async function goto(page, args) {
  await page.goto(args[0], { waitUntil: "networkidle" });
}

async function keypress(page, args) {
  await page.keyboard.press(args[0]);
}

async function mouseDown(page) {
  await page.mouse.down();
}

async function mouseUp(page) {
  await page.mouse.up();
}

async function move(page, args) {
  await page.mouse.move(Number(args[0]), Number(args[1]));
}

async function rclick(page, args, context, selectedElement) {
  if (selectedElement) {
    await selectedElement.click({ button: 'right' });
  } else if (args.length >= 2) {
    await page.mouse.click(Number(args[0]), Number(args[1]), { button: "right" });
  } else {
    console.warn('`rclick` command needs a `select` block or coordinates.');
  }
}

async function wait(page, args) {
  await page.waitForTimeout(Number(args[0]));
}

async function write(page, args, context, selectedElement) {
  if (selectedElement) {
    const textToWrite = args.join(' ');
    await selectedElement.fill(textToWrite);
  } else {
    console.warn('`write` command called without a `select` block.');
  }
}

export function createSteps(page, context) {
  let screenshotIndex = 0;

  async function screenshot() {
    screenshotIndex++;
    const screenshotPath = await context.takeAndSaveScreenshot(page, `${context.baseName}-${screenshotIndex}`);
    console.log(`Screenshot saved: ${screenshotPath}`);
  }

  const actionHandlers = {
    click,
    customEvent,
    goto,
    keypress,
    mouseDown,
    mouseUp,
    move,
    rclick,
    screenshot,
    wait,
    write,
  };

  const blockHandlers = {
    async select(args) {
      const testId = args[0];
      const innerSelector = args.slice(1).join(' ');
      let el = page.getByTestId(testId);
      if (innerSelector) {
        el = el.locator(innerSelector);
      }
      return el;
    }
  };

  async function executeSingleStep(stepString, selectedElement) {
    const [command, ...args] = stepString.split(" ");
    const actionFn = actionHandlers[command];
    if (actionFn) {
      await actionFn(page, args, context, selectedElement);
    } else {
      console.warn(`Unknown step command: "${command}"`);
    }
  }

  return {
    async executeStep(step) {
      if (typeof step === 'string') {
        await executeSingleStep(step, null);
      } else if (typeof step === 'object' && step !== null) {
        const blockCommandString = Object.keys(step)[0];
        const nestedStepStrings = step[blockCommandString];
        const [command, ...args] = blockCommandString.split(" ");

        const blockFn = blockHandlers[command];
        if (blockFn) {
          const selectedElement = await blockFn(args);
          for (const nestedStep of nestedStepStrings) {
            await executeSingleStep(nestedStep, selectedElement);
          }
        } else {
          console.warn(`Unsupported block command: "${command}". Only "select" is supported.`);
        }
      }
    }
  };
}