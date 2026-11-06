// Run with node spec/overlayLifecycle.browser.mjs.
// Lifecycle fixes for rtgl-popover and rtgl-dialog in Chromium and WebKit:
// - an overlay whose host keeps `open` stays shown when the browser closes its
//   inner dialog natively (Chromium's second Escape or Android back),
// - a popover press that starts in the content and ends on the backdrop does
//   not emit `close`,
// - a dialog moved while open still re-centers and wraps long tokens when its
//   slotted content changes.
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
  import createText from "./src/primitives/text.js";
  import createView from "./src/primitives/view.js";
  customElements.define("rtgl-view", createView({}));
  customElements.define("rtgl-text", createText({}));
  customElements.define("rtgl-dialog", createDialog({}));
  customElements.define("rtgl-popover", createPopover({}));
`);

const OVERLAYS = {
  popover: `
    <rtgl-popover id="overlay" x="300" y="200">
      <div slot="content" id="content" style="width: 200px; height: 80px">Content</div>
    </rtgl-popover>`,
  dialog: `
    <rtgl-dialog id="overlay" s="md">
      <div slot="content" id="content" style="height: 100px">Content</div>
    </rtgl-dialog>`,
};

const BACKDROP = { x: 850, y: 550 };

const newPage = async (browser, html, viewport) => {
  const page = await newThemedPage(browser, viewport ? { viewport } : {});
  const errors = collectPageErrors(page);
  await page.addScriptTag({ content: script });
  await page.evaluate((html) => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<button id="opener" style="position: fixed; left: 10px; top: 10px">Open</button>${html}`,
    );
  }, html);
  return { page, errors };
};

const innerDialogState = (page) =>
  page.evaluate(() => {
    const inner = document.getElementById("overlay").shadowRoot.querySelector("dialog");
    return {
      hostOpen: document.getElementById("overlay").hasAttribute("open"),
      innerOpen: inner.open,
      modal: inner.matches(":modal"),
      contentShown: document.getElementById("content").getClientRects().length > 0,
    };
  });

await forEachEngine(async ({ name, browser }) => {
  const label = (text) => `${name}: ${text}`;

  // The opener click gives the page user activation, so the first Escape is
  // cancelable. Nothing runs page.evaluate between the Escapes (it would grant
  // activation again), so in Chromium the second `cancel` is not cancelable
  // and the browser closes the inner dialog itself.
  for (const kind of ["popover", "dialog"]) {
    const { page, errors } = await newPage(browser, OVERLAYS[kind]);
    await page.evaluate(() => {
      const overlay = document.getElementById("overlay");
      const inner = overlay.shadowRoot.querySelector("dialog");
      window.__log = { close: 0, cancelable: [] };
      overlay.addEventListener("close", () => {
        window.__log.close += 1;
      });
      inner.addEventListener("cancel", (event) => {
        window.__log.cancelable.push(event.cancelable);
      });
      document.getElementById("opener").addEventListener("click", () => {
        overlay.setAttribute("open", "");
      });
    });
    await page.click("#opener");
    await page.waitForFunction(() =>
      document.getElementById("overlay").shadowRoot.querySelector("dialog").open,
    );
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    const log = await page.evaluate(() => window.__log);
    if (name === "chromium") {
      assert.deepEqual(
        log.cancelable,
        [true, false],
        label(`${kind}: precondition, Chromium's second Escape is not cancelable`),
      );
    }
    assert.equal(log.close, 2, label(`${kind}: each Escape emits one close`));
    assert.deepEqual(
      await innerDialogState(page),
      { hostOpen: true, innerOpen: true, modal: true, contentShown: true },
      label(`${kind}: stays shown while the host keeps open`),
    );

    if (kind === "popover") {
      const frames = await page.evaluate(
        () =>
          new Promise((resolve) => {
            let count = 0;
            const requestFrame = window.requestAnimationFrame;
            window.requestAnimationFrame = (callback) => {
              count += 1;
              return requestFrame.call(window, callback);
            };
            setTimeout(() => {
              window.requestAnimationFrame = requestFrame;
              resolve(count);
            }, 300);
          }),
      );
      assert.equal(frames, 0, label("an idle open popover schedules no frames"));
    }

    // A consumer that closes on `close` still ends closed, and can reopen.
    await page.evaluate(() => {
      const overlay = document.getElementById("overlay");
      overlay.addEventListener("close", () => overlay.removeAttribute("open"));
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    assert.deepEqual(
      await innerDialogState(page),
      { hostOpen: false, innerOpen: false, modal: false, contentShown: false },
      label(`${kind}: closes when the consumer removes open`),
    );
    await page.evaluate(() => document.getElementById("overlay").setAttribute("open", ""));
    await page.waitForTimeout(300);
    assert.equal(
      (await innerDialogState(page)).innerOpen,
      true,
      label(`${kind}: reopens through the attribute`),
    );
    await page.close();
    assert.deepEqual(errors, [], label(`${kind}: no page errors`));
  }

  {
    const { page, errors } = await newPage(browser, OVERLAYS.popover);
    await page.evaluate(() => {
      const overlay = document.getElementById("overlay");
      window.__closes = 0;
      overlay.addEventListener("close", () => {
        window.__closes += 1;
      });
      overlay.setAttribute("open", "");
    });
    await page.waitForFunction(() =>
      document.getElementById("overlay").hasAttribute("positioned"),
    );
    const box = await page.locator("#content").boundingBox();
    const closes = () => page.evaluate(() => window.__closes);

    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(BACKDROP.x, BACKDROP.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.equal(await closes(), 0, label("a drag from popover content to the backdrop does not close"));

    await page.mouse.click(BACKDROP.x, BACKDROP.y);
    await page.waitForTimeout(100);
    assert.equal(await closes(), 1, label("a plain backdrop click still closes"));

    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(BACKDROP.x, BACKDROP.y, { steps: 5 });
    await page.mouse.up();
    await page.mouse.click(BACKDROP.x, BACKDROP.y, { button: "right" });
    await page.waitForTimeout(100);
    assert.equal(await closes(), 2, label("a backdrop right-click after a drag still closes"));
    await page.close();
    assert.deepEqual(errors, [], label("popover drag: no page errors"));
  }

  for (const mutation of ["append", "prepend"]) {
    const { page, errors } = await newPage(browser, "<div id='from'></div><div id='to'></div>", {
      width: 1000,
      height: 800,
    });
    const frames = () =>
      page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 30))),
            ),
          ),
      );
    await page.evaluate(() => {
      const dialog = document.createElement("rtgl-dialog");
      dialog.id = "dialog";
      dialog.setAttribute("s", "md");
      dialog.innerHTML = '<div slot="content" style="height: 100px">first</div>';
      document.getElementById("from").append(dialog);
      dialog.setAttribute("open", "");
    });
    await frames();
    await page.evaluate(() => document.getElementById("to").append(document.getElementById("dialog")));
    await frames();
    await page.evaluate((mutation) => {
      const dialog = document.getElementById("dialog");
      const extra = document.createElement("div");
      extra.slot = "content";
      extra.style.height = "500px";
      extra.innerHTML = '<rtgl-text id="long">averyveryveryveryveryverylongtoken</rtgl-text>';
      dialog[mutation](extra);
    }, mutation);
    await frames();
    const result = await page.evaluate(() => {
      const slot = document
        .getElementById("dialog")
        .shadowRoot.querySelector('slot[name="content"]');
      const rect = slot.getBoundingClientRect();
      return {
        fitsViewport: rect.top >= 0 && rect.bottom <= innerHeight,
        longTokenSynced: document.getElementById("long").hasAttribute("break-long-tokens"),
      };
    });
    assert.deepEqual(
      result,
      { fitsViewport: true, longTokenSynced: true },
      label(`a dialog moved while open re-centers after content is ${mutation}ed`),
    );
    await page.close();
    assert.deepEqual(errors, [], label("moved dialog: no page errors"));
  }

  console.log(
    `${name}: overlays stay shown after a native close while open, popover drag to backdrop does not close, moved dialog re-centers`,
  );
});
