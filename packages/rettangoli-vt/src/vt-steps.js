export async function click(page, args) {
  await page.mouse.click(Number(args[0]), Number(args[1]), { button: "left" });
}

export async function customEvent(page, args) {
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

export async function goto(page, args) {
  await page.goto(args[0], { waitUntil: "networkidle" });
}

export async function keypress(page, args) {
  await page.keyboard.press(args[0]);
}

export async function mouseDown(page) {
  await page.mouse.down();
}

export async function mouseUp(page) {
  await page.mouse.up();
}

export async function move(page, args) {
  await page.mouse.move(Number(args[0]), Number(args[1]));
}

export async function rclick(page, args) {
  await page.mouse.click(Number(args[0]), Number(args[1]), { button: "right" });
}

export async function screenshot(page, args, context) {
  context.screenshotIndex++;
  const screenshotPath = await context.takeAndSaveScreenshot(page, `${context.baseName}-${context.screenshotIndex}`);
  console.log(`Screenshot saved: ${screenshotPath}`);
}

export async function wait(page, args) {
  await page.waitForTimeout(Number(args[0]));
}