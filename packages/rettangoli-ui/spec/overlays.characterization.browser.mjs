// Run with node spec/overlays.characterization.browser.mjs.
// Characterizes how rtgl-dialog and rtgl-popover behave today in Chromium and
// WebKit. Change detector: a failure here means observable overlay behaviour
// changed, so update an expectation only with an explained diff.
// Deliberately silent about known bugs (second-Escape close in Chromium,
// drag-to-backdrop close, re-show after a native close).
import assert from "node:assert/strict";
import {
  bundle,
  collectPageErrors,
  forEachEngine,
  newThemedPage,
} from "./support/browserHarness.mjs";

const script = await bundle(`
  import createDialog from "./src/primitives/dialog.js";
  import createPopover from "./src/primitives/popover.js";
  import createView from "./src/primitives/view.js";
  customElements.define("rtgl-view", createView({}));
  customElements.define("rtgl-dialog", createDialog({}));
  customElements.define("rtgl-popover", createPopover({}));
`);

const DIALOG = `
  <button id="opener">Opener</button>
  <div id="ancestor">
    <rtgl-dialog id="dialog" s="md">
      <div slot="content">
        <button id="first">First</button>
        <input id="last" aria-label="Last">
      </div>
    </rtgl-dialog>
  </div>`;
const POPOVER = `
  <button id="opener">Opener</button>
  <div id="ancestor">
    <rtgl-popover id="popover" x="300" y="200">
      <div slot="content"><button id="content-button">Content</button></div>
    </rtgl-popover>
  </div>`;
const NESTED = `
  <div id="ancestor">
    <rtgl-dialog id="dialog" s="md">
      <div slot="content">
        <button id="first">First</button>
        <rtgl-popover id="popover" x="300" y="200">
          <div slot="content"><button id="content-button">Content</button></div>
        </rtgl-popover>
      </div>
    </rtgl-dialog>
  </div>`;

// Each scenario gets a fresh page, so a Chromium Escape never follows another
// Escape on the same page. The Escape scenarios also depend on Playwright's
// page.evaluate granting transient user activation: with it the first Escape
// is cancelable and the overlay handles it; without it Chromium closes a modal
// dialog natively on the first Escape. If a Playwright upgrade changes that,
// these scenarios fail without any overlay change.
const scenario = async (browser, html, run) => {
  const page = await newThemedPage(browser);
  const errors = collectPageErrors(page);
  await page.addScriptTag({ content: script });
  await page.evaluate((html) => {
    document.body.insertAdjacentHTML("beforeend", html);
    window.__events = [];
    // Records "<type>@<selector><-<event target id>" for later assertions.
    window.watch = (selector, type) => {
      const node =
        selector === "document" ? document : document.querySelector(selector);
      node.addEventListener(type, (event) => {
        window.__events.push(`${type}@${selector}<-${event.target.id}`);
      });
    };
  }, html);
  const api = {
    page,
    watch: (selector, type) =>
      page.evaluate(([s, t]) => window.watch(s, t), [selector, type]),
    events: () => page.evaluate(() => window.__events.splice(0)),
    setOpen: (id, open) =>
      page.evaluate(
        ([id, open]) => document.getElementById(id).toggleAttribute("open", open),
        [id, open],
      ),
    hasOpenAttr: (id) =>
      page.evaluate((id) => document.getElementById(id).hasAttribute("open"), id),
    // The overlay's own inner <dialog>.
    innerOpen: (id) =>
      page.evaluate(
        (id) => document.getElementById(id).shadowRoot.querySelector("dialog").open,
        id,
      ),
    waitInnerOpen: (id, open = true) =>
      page.waitForFunction(
        ([id, open]) =>
          document.getElementById(id).shadowRoot.querySelector("dialog").open ===
          open,
        [id, open],
      ),
    waitPositioned: (id) =>
      page.waitForFunction(
        (id) => document.getElementById(id).hasAttribute("positioned"),
        id,
      ),
    shadowHas: (id, selector) =>
      page.evaluate(
        ([id, selector]) =>
          document.getElementById(id).shadowRoot.querySelector(selector) !== null,
        [id, selector],
      ),
    activeId: () => page.evaluate(() => document.activeElement?.id ?? ""),
    // True when focus is on the overlay host or inside its light DOM.
    focusIn: (id) =>
      page.evaluate(
        (id) => document.getElementById(id).contains(document.activeElement),
        id,
      ),
    // Lets a negative assertion (nothing else happened) see later work.
    settle: () => page.waitForTimeout(150),
  };
  try {
    await run(api);
  } finally {
    await page.close();
  }
  assert.deepEqual(errors, [], "no page errors");
};

const BACKDROP = { x: 5, y: 5 };

await forEachEngine(async ({ name, browser }) => {
  const label = (text) => `${name}: ${text}`;

  await scenario(browser, DIALOG, async (t) => {
    await t.watch("#dialog", "close");
    assert.equal(await t.shadowHas("dialog", "slot"), false, label("closed dialog has no slot"));
    await t.page.focus("#opener");
    await t.setOpen("dialog", true);
    await t.waitInnerOpen("dialog");
    assert.equal(
      await t.page.evaluate(() =>
        document.getElementById("dialog").shadowRoot.querySelector("dialog").matches(":modal"),
      ),
      true,
      label("open attribute shows a modal dialog"),
    );
    assert.equal(await t.shadowHas("dialog", 'dialog > slot[name="content"]'), true);
    assert.equal(await t.focusIn("dialog"), true, label("focus moves into the open dialog"));
    await t.setOpen("dialog", false);
    await t.waitInnerOpen("dialog", false);
    assert.equal(await t.shadowHas("dialog", "slot"), false, label("closing unmounts the content slot"));
    assert.equal(await t.activeId(), "opener", label("focus returns to the opener"));
    await t.settle();
    assert.deepEqual(await t.events(), [], label("closing through the attribute emits no close"));
  });

  await scenario(browser, DIALOG, async (t) => {
    await t.watch("#dialog", "close");
    await t.watch("document", "close");
    await t.setOpen("dialog", true);
    await t.waitInnerOpen("dialog");
    await t.page.keyboard.press("Escape");
    await t.settle();
    assert.deepEqual(
      await t.events(),
      ["close@#dialog<-dialog", "close@document<-dialog"],
      label("one Escape emits one bubbling close from the host"),
    );
    assert.equal(await t.innerOpen("dialog"), true, label("dialog stays open after Escape"));
    assert.equal(await t.hasOpenAttr("dialog"), true);
    await t.setOpen("dialog", false);
    await t.waitInnerOpen("dialog", false);
  });

  await scenario(browser, DIALOG, async (t) => {
    await t.watch("#dialog", "close");
    await t.watch("#ancestor", "click");
    await t.setOpen("dialog", true);
    await t.waitInnerOpen("dialog");
    await t.page.click("#first");
    await t.settle();
    assert.deepEqual(
      await t.events(),
      ["click@#ancestor<-first"],
      label("content click does not close and bubbles to ancestors"),
    );
    await t.page.mouse.click(BACKDROP.x, BACKDROP.y);
    await t.settle();
    assert.deepEqual(
      await t.events(),
      ["close@#dialog<-dialog", "click@#ancestor<-dialog"],
      label("backdrop click emits close and the click still bubbles"),
    );
    assert.equal(await t.innerOpen("dialog"), true, label("dialog stays open after a backdrop click"));
  });

  await scenario(browser, DIALOG, async (t) => {
    await t.setOpen("dialog", true);
    await t.waitInnerOpen("dialog");
    // First and last tabbable elements are the wrap points of the Tab trap.
    await t.page.focus("#first");
    const steps = [];
    for (const key of ["Tab", "Tab", "Shift+Tab"]) {
      await t.page.keyboard.press(key);
      steps.push(await t.activeId());
    }
    assert.deepEqual(
      steps,
      ["last", "first", "last"],
      label("Tab wraps last -> first and Shift+Tab wraps first -> last"),
    );
    assert.equal(await t.focusIn("dialog"), true, label("focus stays inside the modal"));
  });

  await scenario(browser, POPOVER, async (t) => {
    await t.watch("#popover", "positioned");
    await t.watch("document", "positioned");
    assert.equal(
      await t.shadowHas("popover", 'slot[name="content"]'),
      false,
      label("closed popover has no content slot"),
    );
    await t.page.focus("#opener");
    await t.setOpen("popover", true);
    await t.waitInnerOpen("popover");
    await t.waitPositioned("popover");
    assert.equal(await t.focusIn("popover"), true, label("focus moves into the open popover"));
    assert.equal(
      await t.page.evaluate(() =>
        document.getElementById("popover").shadowRoot.querySelector("dialog").matches(":modal"),
      ),
      true,
      label("popover opens as a modal dialog by default"),
    );
    assert.equal(
      await t.shadowHas("popover", 'dialog .popover-container slot[name="content"]'),
      true,
    );
    assert.equal(await t.shadowHas("popover", 'dialog slot[name="floating"]'), true);
    assert.deepEqual(
      await t.page.evaluate(() => {
        const popover = document.getElementById("popover");
        return {
          place: popover.getAttribute("data-rtgl-active-place"),
          style: popover.shadowRoot.querySelector(".popover-container").style.cssText,
        };
      }),
      { place: "bs", style: "left: 300px; top: 208px;" },
      label("x/y position the container at the default bottom-start place"),
    );
    assert.deepEqual(
      await t.events(),
      ["positioned@#popover<-popover", "positioned@document<-popover"],
      label("positioned is emitted once and bubbles"),
    );
    await t.setOpen("popover", false);
    await t.waitInnerOpen("popover", false);
    assert.equal(
      await t.shadowHas("popover", 'slot[name="content"]'),
      false,
      label("closing unmounts the content slot"),
    );
    assert.equal(
      await t.page.evaluate(() => document.getElementById("popover").hasAttribute("positioned")),
      false,
      label("closing removes the positioned attribute"),
    );
    assert.equal(await t.activeId(), "opener", label("focus returns to the opener"));
  });

  await scenario(browser, POPOVER, async (t) => {
    await t.watch("#popover", "close");
    await t.watch("document", "close");
    await t.setOpen("popover", true);
    await t.waitInnerOpen("popover");
    await t.waitPositioned("popover");
    await t.page.keyboard.press("Escape");
    await t.settle();
    assert.deepEqual(
      await t.events(),
      ["close@#popover<-popover", "close@document<-popover"],
      label("one Escape emits one bubbling close"),
    );
    assert.equal(await t.innerOpen("popover"), true, label("popover stays open after Escape"));
    assert.equal(await t.hasOpenAttr("popover"), true);
    await t.setOpen("popover", false);
    await t.waitInnerOpen("popover", false);
  });

  await scenario(browser, POPOVER, async (t) => {
    await t.watch("#popover", "close");
    await t.watch("#ancestor", "click");
    await t.watch("document", "click");
    await t.setOpen("popover", true);
    await t.waitInnerOpen("popover");
    await t.waitPositioned("popover");
    await t.page.click("#content-button");
    await t.settle();
    assert.deepEqual(
      await t.events(),
      [],
      label("content click neither closes nor reaches host ancestors (stopPropagation)"),
    );
    await t.page.mouse.click(BACKDROP.x, BACKDROP.y);
    await t.settle();
    assert.deepEqual(
      await t.events(),
      ["close@#popover<-popover"],
      label("backdrop click emits close and its click is stopped too"),
    );
    assert.equal(await t.innerOpen("popover"), true, label("popover stays open after a backdrop click"));
  });

  await scenario(browser, NESTED, async (t) => {
    await t.watch("#popover", "close");
    await t.watch("#dialog", "close");
    await t.setOpen("dialog", true);
    await t.waitInnerOpen("dialog");
    await t.setOpen("popover", true);
    await t.waitInnerOpen("popover");
    await t.waitPositioned("popover");
    await t.page.keyboard.press("Escape");
    await t.settle();
    assert.deepEqual(
      await t.events(),
      ["close@#popover<-popover", "close@#dialog<-popover"],
      label("a nested popover's close bubbles to the dialog host"),
    );
    assert.equal(await t.innerOpen("popover"), true);
    assert.equal(await t.innerOpen("dialog"), true);
    await t.page.mouse.click(BACKDROP.x, BACKDROP.y);
    await t.settle();
    assert.deepEqual(
      await t.events(),
      ["close@#popover<-popover", "close@#dialog<-popover"],
      label("so does a nested popover's backdrop click"),
    );
  });

  // close is bubbles:true, composed:false with an empty detail; positioned is
  // bubbles:true, composed:true. Observe both from outside a shadow root.
  await scenario(browser, "<div id='host'></div>", async (t) => {
    await t.page.evaluate(() => {
      const root = document.getElementById("host").attachShadow({ mode: "open" });
      root.innerHTML =
        '<rtgl-popover id="inner" x="100" y="100"><div slot="content">x</div></rtgl-popover>';
      window.flags = [];
      const record = (where) => (event) =>
        window.flags.push(
          `${event.type}@${where} bubbles=${event.bubbles} composed=${event.composed} detail=${JSON.stringify(event.detail)}`,
        );
      for (const type of ["close", "positioned"]) {
        root.addEventListener(type, record("shadowRoot"));
        document.addEventListener(type, record("document"));
      }
      root.getElementById("inner").setAttribute("open", "");
    });
    await t.page.waitForFunction(() =>
      document.getElementById("host").shadowRoot.getElementById("inner").hasAttribute("positioned"),
    );
    await t.page.keyboard.press("Escape");
    await t.settle();
    const flags = await t.page.evaluate(() => window.flags);
    assert.equal(flags.length, 3, label("positioned crosses the shadow root, close does not"));
    assert.match(flags[0], /^positioned@shadowRoot bubbles=true composed=true detail=\{"left":100,"top":108,"place":"bs"\}$/);
    assert.match(flags[1], /^positioned@document bubbles=true composed=true /);
    assert.equal(flags[2], 'close@shadowRoot bubbles=true composed=false detail={}');
  });

  console.log(
    `${name}: dialog and popover open/close, Escape, backdrop and content clicks, focus return, Tab trap, nested close and event flags match today's behaviour`,
  );
});
