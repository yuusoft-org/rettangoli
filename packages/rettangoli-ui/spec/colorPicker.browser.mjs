// Run after bun run build:dev: node spec/colorPicker.browser.mjs.
// Real-browser check for rtgl-color-picker: opens the custom panel, drags the
// saturation square with the mouse, types a hex code, verifies Escape focus
// restoration, then repeats at a 390x844 touch viewport where the popover must
// open centered with an overlay and accept touch drags without scrolling.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const script = await readFile("vt/static/public/main.js", "utf8");
const css =
  (await readFile("vt/static/public/base.css", "utf8")) +
  (await readFile("vt/static/public/theme-rtgl-slate.css", "utf8"));
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const setupPage = async (page) => {
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  await page.setContent("<body></body>");
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: script });
  await page.evaluate(() => {
    const picker = document.createElement("rtgl-color-picker");
    picker.id = "picker";
    picker.setAttribute("value", "#3498db");
    picker.setAttribute("aria-label", "Accent color");
    const filler = document.createElement("div");
    filler.style.height = "2000px";
    document.body.append(picker, filler);
    window.events = { input: [], change: [] };
    picker.addEventListener("value-input", (event) => window.events.input.push(event.detail.value));
    picker.addEventListener("value-change", (event) => window.events.change.push(event.detail.value));
  });
};

const openPicker = async (page) => {
  await page.locator("#picker button.trigger").click();
  await page.locator("rtgl-popover[positioned] .sv").waitFor({ state: "visible", timeout: 3000 });
  return page.evaluate(() => {
    const host = document.getElementById("picker");
    return {
      expanded: host.shadowRoot.querySelector("button.trigger").getAttribute("aria-expanded"),
      hasPopup: host.shadowRoot.querySelector("button.trigger").getAttribute("aria-haspopup"),
      focused: host.shadowRoot.activeElement?.className ?? null,
      value: host.value,
    };
  });
};

const browser = await chromium.launch({ headless: true });
try {
  // --- desktop: open, mouse drag, hex typing, Escape focus return ---
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await desktop.newPage();
  await setupPage(page);

  const opened = await openPicker(page);
  check(opened.expanded === "true", "trigger aria-expanded must be true while open");
  check(opened.hasPopup === "dialog", "trigger must declare aria-haspopup=dialog");
  check(opened.focused === "sv", `open must focus the square, focused: ${opened.focused}`);

  const squareBox = await page.locator("#picker .sv").boundingBox();
  await page.mouse.move(squareBox.x + squareBox.width * 0.75, squareBox.y + squareBox.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(squareBox.x + squareBox.width * 0.25, squareBox.y + squareBox.height * 0.75, { steps: 4 });
  await page.mouse.up();
  let events = await page.evaluate(() => window.events);
  check(events.input.length >= 5, `mouse drag must fire value-input per tick, got ${events.input.length}`);
  check(events.change.length === 1, `mouse drag must fire one value-change, got ${events.change.length}`);
  const afterDrag = await page.evaluate(() => document.getElementById("picker").value);
  check(afterDrag !== "#3498db", "mouse drag must change the color");
  check(events.change[0] === afterDrag, "value-change detail must match the released color");

  const hexAttributes = await page.evaluate(() => {
    const input = document.getElementById("picker").shadowRoot.querySelector(".hexfield input");
    return {
      type: input.type,
      inputmode: input.getAttribute("inputmode"),
      enterkeyhint: input.getAttribute("enterkeyhint"),
      autocomplete: input.getAttribute("autocomplete"),
      autocapitalize: input.getAttribute("autocapitalize"),
      spellcheck: input.getAttribute("spellcheck"),
      maxlength: input.getAttribute("maxlength"),
      ariaLabel: input.getAttribute("aria-label"),
    };
  });
  check(hexAttributes.type === "text" && hexAttributes.inputmode === "text", "hex field must ask for a plain text keyboard");
  check(hexAttributes.enterkeyhint === "done" && hexAttributes.autocapitalize === "off", "hex field must set done key and no autocapitalize");
  check(hexAttributes.autocomplete === "off" && hexAttributes.spellcheck === "false" && hexAttributes.maxlength === "7", "hex field must disable assistance attrs");
  check(hexAttributes.ariaLabel === "Hex color", "hex field must be named");

  await page.locator("#picker .hexfield input").fill("e74c3c");
  await page.keyboard.press("Enter");
  events = await page.evaluate(() => window.events);
  check(events.input.includes("#e74c3c"), "typing six hex digits must live-update value-input");
  check(events.change[events.change.length - 1] === "#e74c3c", "Enter must commit value-change");
  check(await page.evaluate(() => document.getElementById("picker").value) === "#e74c3c", "hex commit must apply the color");

  await page.evaluate(() => document.getElementById("picker").shadowRoot.querySelector(".sv").focus());
  await page.keyboard.press("Escape");
  const afterEscape = await page.evaluate(() => {
    const host = document.getElementById("picker");
    return {
      open: host.shadowRoot.querySelector("rtgl-popover").hasAttribute("open"),
      expanded: host.shadowRoot.querySelector("button.trigger").getAttribute("aria-expanded"),
      focused: host.shadowRoot.activeElement?.className ?? null,
    };
  });
  check(afterEscape.open === false, "Escape must close the picker");
  check(afterEscape.expanded === "false", "trigger aria-expanded must reset on close");
  check(afterEscape.focused === "trigger", `Escape must return focus to the trigger, focused: ${afterEscape.focused}`);
  await desktop.close();

  // --- mobile: centered overlay popover and scroll-free touch dragging ---
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const touchPage = await mobile.newPage();
  await setupPage(touchPage);

  const mobileOpened = await openPicker(touchPage);
  check(mobileOpened.focused === "sv", "mobile open must focus the square");
  const overlayState = await touchPage.evaluate(() => {
    const popover = document.getElementById("picker").shadowRoot.querySelector("rtgl-popover");
    const container = popover.shadowRoot.querySelector(".popover-container");
    const dialog = popover.shadowRoot.querySelector("dialog");
    const rect = container.getBoundingClientRect();
    return {
      activePlace: popover.getAttribute("data-rtgl-active-place"),
      overlay: popover.getAttribute("data-rtgl-active-overlay"),
      backdrop: getComputedStyle(dialog, "::backdrop").backgroundColor,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
  check(overlayState.activePlace === "center", `phone viewport must switch to centered placement, got ${overlayState.activePlace}`);
  check(overlayState.overlay === "true", "phone viewport must enable the dimmed overlay");
  check(
    overlayState.backdrop !== "rgba(0, 0, 0, 0)" && overlayState.backdrop !== "transparent",
    "phone overlay backdrop must be painted",
  );
  check(Math.abs(overlayState.centerX - overlayState.vw / 2) <= 2, "popover must be centered horizontally");
  check(Math.abs(overlayState.centerY - overlayState.vh / 2) <= 2, "popover must be centered vertically");

  const touchBox = await touchPage.locator("#picker .sv").boundingBox();
  const startX = touchBox.x + touchBox.width * 0.3;
  const startY = touchBox.y + touchBox.height * 0.3;
  const cdp = await mobile.newCDPSession(touchPage);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y: startY }] });
  for (let step = 1; step <= 5; step += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{
        x: startX + touchBox.width * 0.08 * step,
        y: startY + touchBox.height * 0.08 * step,
      }],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const touchState = await touchPage.evaluate(() => ({
    scrollY: window.scrollY,
    value: document.getElementById("picker").value,
    inputCount: window.events.input.length,
    changeCount: window.events.change.length,
  }));
  check(touchState.scrollY === 0, `touch drag must not scroll the page, scrollY: ${touchState.scrollY}`);
  check(touchState.value !== "#3498db", "touch drag must change the color");
  check(touchState.inputCount > 0, "touch drag must fire value-input");
  check(touchState.changeCount === 1, `touch release must fire one value-change, got ${touchState.changeCount}`);
  await mobile.close();
} finally {
  await browser.close();
}

assert.deepEqual(failures, []);
console.log(
  "Chromium: color picker opens with focus on the square, mouse and touch drags fire live/commit events, hex typing commits, Escape restores trigger focus, and phones get a centered overlay without page scroll.",
);
