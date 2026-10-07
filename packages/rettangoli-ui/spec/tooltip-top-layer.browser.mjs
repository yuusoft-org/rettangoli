// Run after bun run build:dev: node spec/tooltip-top-layer.browser.mjs.
// Tooltips open in the browser top layer, so an open modal dialog or popover
// cannot cover them wherever the tooltip sits in the DOM, while the page and
// any open dialog beneath stay interactive.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import { chromium, webkit } from "playwright";

const script = await readFile("vt/static/public/main.js", "utf8");
const css =
  (await readFile("vt/static/public/base.css", "utf8")) +
  (await readFile("vt/static/public/theme-rtgl-mono.css", "utf8"));
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const setup = async (browser, html, { withoutPopoverApi = false } = {}) => {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  await page.setContent(`<body class="light">${html}</body>`);
  await page.addStyleTag({ content: css });
  if (withoutPopoverApi) {
    await page.evaluate(() => {
      delete HTMLElement.prototype.showPopover;
      delete HTMLElement.prototype.hidePopover;
    });
  }
  await page.evaluate(() => {
    window.__frames = 0;
    const requestFrame = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      window.__frames += 1;
      return requestFrame(callback);
    };
  });
  await page.addScriptTag({ content: script });
  // Let dialogs open and finish their entry animation.
  await page.waitForTimeout(400);
  return page;
};

const innerPopover = (tipId) =>
  `document.getElementById(${JSON.stringify(tipId)}).shadowRoot.querySelector("rtgl-popover")`;

// Opens a tooltip at a viewport point and waits until it is positioned.
const openTooltip = async (page, tipId, { x, y, place }) => {
  await page.evaluate(
    ({ tipId, x, y, place }) => {
      const tip = document.getElementById(tipId);
      tip.setAttribute("place", place);
      tip.setAttribute("x", String(x));
      tip.setAttribute("y", String(y));
      tip.setAttribute("open", "");
    },
    { tipId, x, y, place },
  );
  await page.waitForFunction(
    (expr) => eval(expr)?.hasAttribute("positioned"),
    innerPopover(tipId),
  );
};

const closeTooltip = async (page, tipId) => {
  await page.evaluate((tipId) => document.getElementById(tipId).removeAttribute("open"), tipId);
  await page.waitForFunction(
    (expr) => !eval(expr).hasAttribute("positioned"),
    innerPopover(tipId),
  );
};

const tooltipState = (page, tipId) =>
  page.evaluate((expr) => {
    const popover = eval(expr);
    const dialog = popover.shadowRoot.querySelector("dialog");
    const surface = popover.shadowRoot.querySelector("[data-rtgl-popover-content]");
    const rect = popover.shadowRoot.querySelector(".popover-container").getBoundingClientRect();
    const rgb = getComputedStyle(surface).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
    return {
      popoverOpen: dialog.hasAttribute("popover") && dialog.matches(":popover-open"),
      popoverAttr: dialog.getAttribute("popover"),
      dialogOpen: dialog.open,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      background: rgb,
    };
  }, innerPopover(tipId));

const boxOf = (page, expr) =>
  page.evaluate((expr) => {
    const rect = eval(expr).getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  }, expr);

const pixelAt = async (page, x, y) => {
  const png = PNG.sync.read(await page.screenshot());
  const offset = (Math.round(y) * png.width + Math.round(x)) * 4;
  return Array.from(png.data.subarray(offset, offset + 3));
};

const sameColor = (a, b, tolerance = 3) =>
  a.every((channel, index) => Math.abs(channel - b[index]) <= tolerance);

// Samples just inside the tooltip's bottom-left corner, clear of its text.
const tooltipPaintedAt = async (page, state, point) => {
  const pixel = await pixelAt(page, point.x, point.y);
  return { painted: sameColor(pixel, state.background), pixel };
};

const dialogBox = (dialogId) =>
  `document.getElementById(${JSON.stringify(dialogId)}).shadowRoot.querySelector('slot[name="content"]')`;
const popoverPanel = (popoverId) =>
  `document.getElementById(${JSON.stringify(popoverId)}).shadowRoot.querySelector("[data-rtgl-popover-content]")`;

const TIP = `<rtgl-tooltip id="tip" content="Tooltip above everything"></rtgl-tooltip>`;
const DIALOG = (inner = "") => `
  <rtgl-dialog id="dialog" open s="sm">
    <rtgl-view slot="content" g="md">
      <rtgl-text>Dialog body</rtgl-text>
      <rtgl-button id="dialog-button">Dialog action</rtgl-button>
      <rtgl-text>More dialog content</rtgl-text>
      ${inner}
    </rtgl-view>
  </rtgl-dialog>`;

const run = async (engineName, browser) => {
  const fail = (message) => `${engineName}: ${message}`;

  // 1. Outside an open modal dialog, straddling the top edge of its box.
  {
    const page = await setup(browser, `${DIALOG()}${TIP}`);
    const box = await boxOf(page, dialogBox("dialog"));
    await openTooltip(page, "tip", { x: box.left + box.width / 2, y: box.top + 30, place: "t" });
    const state = await tooltipState(page, "tip");
    check(state.popoverOpen && state.popoverAttr === "manual", fail("tooltip outside a dialog is not a top-layer popover"));
    check(state.rect.bottom > box.top + 8 && state.rect.top < box.top - 8, fail("tooltip does not straddle the dialog edge"));
    const insideDialog = await tooltipPaintedAt(page, state, { x: state.rect.left + 4, y: state.rect.bottom - 4 });
    const outsideDialog = await tooltipPaintedAt(page, state, { x: state.rect.left + 4, y: state.rect.top + 4 });
    check(insideDialog.painted, fail(`dialog box covers the tooltip (pixel ${insideDialog.pixel}, tooltip ${state.background})`));
    check(outsideDialog.painted, fail(`dialog backdrop dims the tooltip (pixel ${outsideDialog.pixel}, tooltip ${state.background})`));

    // The open dialog stays interactive under the tooltip's backdrop.
    await page.evaluate(() => {
      window.__dialogClicks = 0;
      document.getElementById("dialog-button").addEventListener("click", () => { window.__dialogClicks += 1; });
    });
    const button = await boxOf(page, `document.getElementById("dialog-button")`);
    await page.mouse.click(button.left + button.width / 2, button.top + button.height / 2);
    check(await page.evaluate(() => window.__dialogClicks) === 1, fail("tooltip backdrop blocks clicks inside the open dialog"));

    // Tooltip closes cleanly and its pixels are gone.
    await closeTooltip(page, "tip");
    const closed = await tooltipState(page, "tip");
    check(!closed.popoverOpen && closed.popoverAttr === null && !closed.dialogOpen, fail("closed tooltip left its popover state behind"));
    check(!(await tooltipPaintedAt(page, state, { x: state.rect.left + 4, y: state.rect.bottom - 4 })).painted, fail("closed tooltip is still painted"));
    await page.close();
  }

  // 2. Outside an open modal popover, overlapping its panel.
  {
    const page = await setup(browser, `
      <rtgl-popover id="menu" open x="300" y="200" place="bs" content-g="md">
        <rtgl-text>Popover body line one</rtgl-text>
        <rtgl-text>Popover body line two</rtgl-text>
        <rtgl-text>Popover body line three</rtgl-text>
      </rtgl-popover>${TIP}`);
    await page.waitForFunction(() => document.getElementById("menu").hasAttribute("positioned"));
    const panel = await boxOf(page, popoverPanel("menu"));
    await openTooltip(page, "tip", { x: panel.left + panel.width / 2, y: panel.top + 10, place: "b" });
    const state = await tooltipState(page, "tip");
    check(state.rect.top > panel.top && state.rect.bottom < panel.bottom + 40, fail("tooltip does not overlap the popover panel"));
    const overPanel = await tooltipPaintedAt(page, state, { x: state.rect.left + 4, y: state.rect.bottom - 4 });
    check(overPanel.painted, fail(`popover panel covers the tooltip (pixel ${overPanel.pixel}, tooltip ${state.background})`));
    await page.close();
  }

  // 3. Inside a dialog it still renders past the dialog edge at the expected spot.
  {
    const page = await setup(browser, DIALOG(TIP));
    const box = await boxOf(page, dialogBox("dialog"));
    const anchor = { x: box.left + 40, y: box.top + 12 };
    await openTooltip(page, "tip", { ...anchor, place: "t" });
    const state = await tooltipState(page, "tip");
    check(Math.abs(state.rect.top - (anchor.y - state.rect.height - 8)) <= 1, fail(`tooltip inside a dialog is misplaced (top ${state.rect.top})`));
    const aboveDialog = await tooltipPaintedAt(page, state, { x: state.rect.left + 4, y: state.rect.top + 4 });
    check(aboveDialog.painted, fail("tooltip inside a dialog is clipped at the dialog edge"));
    await page.close();
  }

  // 4. A transformed, clipping ancestor no longer captures or clips it.
  {
    const page = await setup(browser, `
      <div id="clip" style="position: absolute; left: 100px; top: 100px; width: 240px; height: 40px; overflow: hidden; transform: translateZ(0);">
        ${TIP}
      </div>`);
    const clip = await boxOf(page, `document.getElementById("clip")`);
    const anchor = { x: clip.left + 120, y: clip.bottom - 10 };
    await openTooltip(page, "tip", { ...anchor, place: "b" });
    const state = await tooltipState(page, "tip");
    check(Math.abs(state.rect.top - (anchor.y + 8)) <= 1, fail(`tooltip in a transformed ancestor is misplaced (top ${state.rect.top})`));
    const belowClip = await tooltipPaintedAt(page, state, { x: state.rect.left + 4, y: state.rect.bottom - 4 });
    check(state.rect.bottom > clip.bottom + 8 && belowClip.painted, fail("tooltip is clipped by an overflow-hidden transformed ancestor"));
    await page.close();
  }

  // 5. The page stays interactive and the trigger keeps hover while it is open.
  {
    const page = await setup(browser, `
      <rtgl-button id="trigger" style="position: absolute; left: 400px; top: 300px;">Trigger</rtgl-button>
      <rtgl-button id="other" style="position: absolute; left: 40px; top: 520px;">Other</rtgl-button>
      ${TIP}`);
    await page.evaluate(() => {
      window.__otherClicks = 0;
      window.__triggerLeaves = 0;
      window.__triggerMoves = 0;
      const trigger = document.getElementById("trigger");
      trigger.addEventListener("mouseleave", () => { window.__triggerLeaves += 1; });
      trigger.addEventListener("mousemove", () => { window.__triggerMoves += 1; });
      document.getElementById("other").addEventListener("click", () => { window.__otherClicks += 1; });
    });
    const trigger = await boxOf(page, `document.getElementById("trigger")`);
    const center = { x: trigger.left + trigger.width / 2, y: trigger.top + trigger.height / 2 };
    await page.mouse.move(center.x, center.y);
    await openTooltip(page, "tip", { x: center.x, y: trigger.top, place: "t" });
    // Apps close hover tooltips on mouseleave; the tooltip's backdrop must not
    // take the pointer away from its trigger.
    const movesBefore = await page.evaluate(() => window.__triggerMoves);
    await page.mouse.move(center.x + 2, center.y);
    await page.mouse.move(center.x - 2, center.y);
    const hover = await page.evaluate(() => ({ leaves: window.__triggerLeaves, moves: window.__triggerMoves }));
    check(hover.leaves === 0 && hover.moves > movesBefore, fail(`opening the tooltip steals the pointer from its trigger (${JSON.stringify(hover)})`));
    const other = await boxOf(page, `document.getElementById("other")`);
    check(
      await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("#other") !== null, { x: other.left + 10, y: other.top + 10 }),
      fail("tooltip backdrop covers the page"),
    );
    await page.mouse.click(other.left + other.width / 2, other.top + other.height / 2);
    check(await page.evaluate(() => window.__otherClicks) === 1, fail("tooltip backdrop blocks page clicks"));

    // Repeated open/close cycles, without runaway animation frames.
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await closeTooltip(page, "tip");
      await openTooltip(page, "tip", { x: trigger.left + trigger.width / 2, y: trigger.top, place: "t" });
    }
    const framesBefore = await page.evaluate(() => window.__frames);
    await page.waitForTimeout(500);
    const idleFrames = (await page.evaluate(() => window.__frames)) - framesBefore;
    check(idleFrames <= 2, fail(`an open tooltip keeps requesting animation frames (${idleFrames} in 500ms)`));
    const state = await tooltipState(page, "tip");
    check(state.popoverOpen, fail("tooltip is not open after reopen cycles"));

    // Removing an open tooltip and adding it back reopens it.
    await page.evaluate(() => {
      const tip = document.getElementById("tip");
      const parent = tip.parentNode;
      tip.remove();
      parent.append(tip);
    });
    await page.waitForFunction((expr) => eval(expr)?.hasAttribute("positioned"), innerPopover("tip"));
    check((await tooltipState(page, "tip")).popoverOpen, fail("tooltip does not reopen after being moved in the DOM"));
    await page.close();
  }

  // 6. A modal opened after the tooltip still covers it.
  {
    const page = await setup(browser, `
      <rtgl-dialog id="later" s="sm">
        <rtgl-view slot="content" g="md"><rtgl-text>Opened later</rtgl-text><rtgl-text>Second line</rtgl-text></rtgl-view>
      </rtgl-dialog>${TIP}`);
    await openTooltip(page, "tip", { x: 450, y: 300, place: "b" });
    const state = await tooltipState(page, "tip");
    await page.evaluate(() => document.getElementById("later").setAttribute("open", ""));
    await page.waitForTimeout(400);
    const box = await boxOf(page, dialogBox("later"));
    const point = { x: state.rect.left + 4, y: state.rect.top + 4 };
    const insideLater = point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom;
    check(insideLater, fail("test setup: tooltip is not under the later dialog"));
    check(!(await tooltipPaintedAt(page, state, point)).painted, fail("tooltip floats above a modal opened after it"));
    await page.close();
  }

  // 7. Other no-overlay popovers keep opening as non-modal dialogs.
  {
    const page = await setup(browser, `
      <rtgl-popover id="plain" open no-overlay x="200" y="200"><rtgl-text>Plain</rtgl-text></rtgl-popover>`);
    await page.waitForFunction(() => document.getElementById("plain").hasAttribute("positioned"));
    const plain = await page.evaluate(() => {
      const dialog = document.getElementById("plain").shadowRoot.querySelector("dialog");
      return { open: dialog.open, popover: dialog.getAttribute("popover") };
    });
    check(plain.open && plain.popover === null, fail("a no-overlay popover without the tooltip flag changed mode"));
    await page.close();
  }

  // 8. Without the Popover API the tooltip falls back to a non-modal dialog.
  {
    const page = await setup(browser, `
      <rtgl-button id="trigger" style="position: absolute; left: 400px; top: 300px;">Trigger</rtgl-button>${TIP}`, { withoutPopoverApi: true });
    const trigger = await boxOf(page, `document.getElementById("trigger")`);
    const anchor = { x: trigger.left + trigger.width / 2, y: trigger.top };
    await openTooltip(page, "tip", { ...anchor, place: "t" });
    const state = await tooltipState(page, "tip");
    check(state.dialogOpen && state.popoverAttr === null, fail("fallback did not open a non-modal dialog"));
    check(Math.abs(state.rect.top - (anchor.y - state.rect.height - 8)) <= 1, fail("fallback tooltip is misplaced"));
    check((await tooltipPaintedAt(page, state, { x: state.rect.left + 4, y: state.rect.bottom - 4 })).painted, fail("fallback tooltip is not painted"));
    await closeTooltip(page, "tip");
    check(!(await tooltipState(page, "tip")).dialogOpen, fail("fallback tooltip did not close"));
    await page.close();
  }
};

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    await run(name, browser);
  } finally {
    await browser.close();
  }
}
assert.deepEqual(failures, []);
console.log(
  "Chromium/WebKit: tooltips paint above open dialogs and popovers, escape clipping ancestors, keep the page interactive, and fall back without the Popover API.",
);
