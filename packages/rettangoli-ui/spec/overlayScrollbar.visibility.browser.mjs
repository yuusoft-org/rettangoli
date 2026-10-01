// Run with node spec/overlayScrollbar.visibility.browser.mjs.
// VT cannot emulate devices whose primary input cannot hover, so this covers
// the `sbv` scrollbar visibility attribute in touch and mouse modes:
// - unset: hidden at rest, revealed by hover or while touch scrolling
// - sbv="touch": visible at rest only when the primary input cannot hover
// - sbv="always": visible at rest on every device
// rtgl-popover forwards content-sbv to its scrolling content surface.
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium, webkit } from "playwright";

const bundle = await build({
  stdin: {
    contents: `
      import createView from './src/primitives/view.js';
      import createGrid from './src/primitives/grid.js';
      import createDialog from './src/primitives/dialog.js';
      import createPopover from './src/primitives/popover.js';
      customElements.define('rtgl-view', createView({}));
      customElements.define('rtgl-grid', createGrid({}));
      customElements.define('rtgl-dialog', createDialog({}));
      customElements.define('rtgl-popover', createPopover({}));
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "iife",
  write: false,
});

const tall = '<div style="height:600px;flex-shrink:0">Content</div>';
const scroller = (tag, id, attrs = "", content = tall) =>
  `<${tag} id="${id}" sv h="120" w="110" ${attrs}>${content}</${tag}>`;

const content = `
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>:root{--spacing-lg:16px;--background:white;--border:black;--border-radius-md:8px}body{margin:0}#surfaces{display:flex;flex-wrap:wrap;gap:8px;padding:8px}</style>
  <div id="surfaces">
    ${scroller("rtgl-view", "default")}
    ${scroller("rtgl-view", "touch", 'sbv="touch"')}
    ${scroller("rtgl-view", "always", 'sbv="always"')}
    ${scroller("rtgl-view", "fits", 'sbv="always"', "<div>Short</div>")}
    ${scroller("rtgl-view", "unknown", 'sbv="sometimes"')}
    ${scroller("rtgl-view", "runtime")}
    ${scroller("rtgl-grid", "grid-always", 'sbv="always"')}
    ${scroller("rtgl-grid", "grid-touch", 'sbv="touch"')}
  </div>
  <rtgl-popover id="popover" x="200" y="420" place="bs" content-w="200" content-h="120" content-sv content-sbv="touch">
    <div style="height:600px;flex-shrink:0">Popover content</div>
  </rtgl-popover>
  <rtgl-dialog id="dialog" s="md">
    <div slot="content">
      <div id="dialog-header" style="height:48px">Header</div>
      ${scroller("rtgl-view", "dialog-touch", 'sbv="touch"')}
    </div>
  </rtgl-dialog>
`;

const SURFACES = [
  "default",
  "touch",
  "always",
  "fits",
  "unknown",
  "runtime",
  "grid-always",
  "grid-touch",
];

const settle = (page, ms = 150) => page.waitForTimeout(ms);

const readStates = (page, ids = SURFACES) =>
  page.evaluate((ids) => {
    const state = (id) => {
      const track = document
        .getElementById(id)
        .shadowRoot.querySelector('[data-rtgl-scrollbar-track="vertical"]');
      if (!track?.hasAttribute("data-visible")) {
        return "none";
      }
      const style = getComputedStyle(track);
      return style.opacity === "1" && style.pointerEvents === "auto"
        ? "visible"
        : "hidden";
    };
    return Object.fromEntries(ids.map((id) => [id, state(id)]));
  }, ids);

const hover = async (page, id) => {
  const box = await page.locator(`#${id}`).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await settle(page, 100);
};

const setSbv = async (page, value) => {
  await page.evaluate((value) => {
    const element = document.getElementById("runtime");
    if (value === null) {
      element.removeAttribute("sbv");
    } else {
      element.setAttribute("sbv", value);
    }
  }, value);
  await settle(page, 50);
  return (await readStates(page, ["runtime"])).runtime;
};

const scrollWithPointer = async (page, id, pointerType) => {
  await page.evaluate(
    ({ id, pointerType }) => {
      const element = document.getElementById(id);
      element.firstElementChild.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          composed: true,
          pointerType,
        }),
      );
      element.scrollTop += 100;
    },
    { id, pointerType },
  );
  await settle(page, 100);
};

const openDialog = async (page) => {
  await page.evaluate(async () => {
    const dialog = document.getElementById("dialog");
    dialog.setAttribute("open", "");
    const slot = dialog.shadowRoot.querySelector('slot[name="content"]');
    await Promise.all(slot.getAnimations().map((animation) => animation.finished));
  });
  await settle(page, 250);
};

const readPopoverState = async (page, contentSbv) => {
  await page.evaluate(async (contentSbv) => {
    const popover = document.getElementById("popover");
    popover.setAttribute("content-sbv", contentSbv);
    popover.setAttribute("open", "");
  }, contentSbv);
  await settle(page, 250);
  return page.evaluate(() => {
    const surface = document.getElementById("popover").content;
    const track = surface.shadowRoot.querySelector(
      '[data-rtgl-scrollbar-track="vertical"]',
    );
    const style = getComputedStyle(track);
    return {
      sbv: surface.getAttribute("sbv"),
      state: !track.hasAttribute("data-visible")
        ? "none"
        : style.opacity === "1" && style.pointerEvents === "auto"
          ? "visible"
          : "hidden",
    };
  });
};

const openPage = async (browser, options) => {
  const page = await browser.newPage(options);
  await page.setContent(content);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await settle(page, 250);
  return page;
};

const AT_REST = {
  touch: {
    default: "hidden",
    touch: "visible",
    always: "visible",
    fits: "none",
    unknown: "hidden",
    runtime: "hidden",
    "grid-always": "visible",
    "grid-touch": "visible",
  },
  mouse: {
    default: "hidden",
    touch: "hidden",
    always: "visible",
    fits: "none",
    unknown: "hidden",
    runtime: "hidden",
    "grid-always": "visible",
    "grid-touch": "hidden",
  },
};

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    // Touch: the primary input cannot hover.
    const touchPage = await openPage(browser, {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    assert.equal(
      await touchPage.evaluate(() => matchMedia("(hover: none)").matches),
      true,
      `${name}: touch emulation must report hover: none`,
    );
    assert.deepEqual(await readStates(touchPage), AT_REST.touch, `${name} touch at rest`);

    await scrollWithPointer(touchPage, "default", "touch");
    assert.equal((await readStates(touchPage, ["default"])).default, "visible");
    await settle(touchPage, 1100);
    assert.equal((await readStates(touchPage, ["default"])).default, "hidden");

    assert.equal(await setSbv(touchPage, "always"), "visible");
    assert.equal(await setSbv(touchPage, "touch"), "visible");
    assert.equal(await setSbv(touchPage, null), "hidden");

    assert.deepEqual(
      await readPopoverState(touchPage, "touch"),
      { sbv: "touch", state: "visible" },
      `${name}: popover content-sbv="touch" on touch`,
    );
    await touchPage.evaluate(() => document.getElementById("popover").removeAttribute("open"));

    await openDialog(touchPage);
    assert.equal(
      (await readStates(touchPage, ["dialog-touch"]))["dialog-touch"],
      "visible",
      `${name}: sbv="touch" inside a dialog on touch`,
    );

    // Mouse: the primary input can hover.
    const mousePage = await openPage(browser, {
      viewport: { width: 1280, height: 720 },
    });
    assert.equal(
      await mousePage.evaluate(() => matchMedia("(hover: hover)").matches),
      true,
      `${name}: desktop must report hover: hover`,
    );
    assert.deepEqual(await readStates(mousePage), AT_REST.mouse, `${name} mouse at rest`);

    await hover(mousePage, "touch");
    assert.equal(
      (await readStates(mousePage, ["touch"])).touch,
      "visible",
      `${name}: sbv="touch" keeps hover reveal with a mouse`,
    );
    await hover(mousePage, "grid-touch");
    assert.equal((await readStates(mousePage, ["grid-touch"]))["grid-touch"], "visible");

    await mousePage.mouse.move(1, 700);
    await settle(mousePage, 100);
    await scrollWithPointer(mousePage, "default", "mouse");
    assert.equal(
      (await readStates(mousePage, ["default"])).default,
      "hidden",
      `${name}: mouse-driven scrolling does not reveal without hover`,
    );

    assert.equal(await setSbv(mousePage, "always"), "visible");
    assert.equal(await setSbv(mousePage, "touch"), "hidden");
    assert.equal(await setSbv(mousePage, null), "hidden");

    const thumb = await mousePage.evaluate(() => {
      const rect = document
        .getElementById("always")
        .shadowRoot.querySelector('[data-rtgl-scrollbar-thumb="vertical"]')
        .getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await mousePage.mouse.move(thumb.x, thumb.y);
    await mousePage.mouse.down();
    await mousePage.mouse.move(thumb.x, thumb.y + 40, { steps: 4 });
    await mousePage.mouse.up();
    assert.ok(
      await mousePage.evaluate(() => document.getElementById("always").scrollTop > 0),
      `${name}: dragging the sbv="always" thumb scrolls`,
    );

    await mousePage.mouse.move(1, 1);
    assert.deepEqual(
      await readPopoverState(mousePage, "touch"),
      { sbv: "touch", state: "hidden" },
      `${name}: popover content-sbv="touch" with a mouse at rest`,
    );
    assert.deepEqual(
      await readPopoverState(mousePage, "always"),
      { sbv: "always", state: "visible" },
      `${name}: popover content-sbv="always" with a mouse at rest`,
    );
    await mousePage.evaluate(() => document.getElementById("popover").removeAttribute("open"));

    await openDialog(mousePage);
    await mousePage.mouse.move(1, 1);
    await settle(mousePage, 100);
    assert.equal(
      (await readStates(mousePage, ["dialog-touch"]))["dialog-touch"],
      "hidden",
      `${name}: sbv="touch" inside a dialog with a mouse at rest`,
    );
    await hover(mousePage, "dialog-touch");
    assert.equal((await readStates(mousePage, ["dialog-touch"]))["dialog-touch"], "visible");

    console.log(`${name}: sbv scrollbar visibility passed in touch and mouse modes`);
  } finally {
    await browser.close();
  }
}
