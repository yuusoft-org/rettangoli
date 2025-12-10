async function click(page, args) {
  await page.mouse.click(Number(args[0]), Number(args[1]), { button: "left" });
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

async function rclick(page, args) {
  await page.mouse.click(Number(args[0]), Number(args[1]), { button: "right" });
}

async function wait(page, args) {
  await page.waitForTimeout(Number(args[0]));
}

export function createSteps(page, context) {
  let screenshotIndex = 0;

  async function screenshot(page) {
    screenshotIndex++;
    const screenshotPath = await context.takeAndSaveScreenshot(page, `${context.baseName}-${screenshotIndex}`);
    console.log(`Screenshot saved: ${screenshotPath}`);
  }

  const stepHandlers = {
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
  };

  return {
    async executeStep(stepString) {
      const [command, ...args] = stepString.split(" ");
      
      const stepFn = stepHandlers[command];
      if (stepFn) {
        await stepFn(page, args, context);
      } else {
        console.warn(`Unknown step command: "${command}"`);
      }
    }
  };
}