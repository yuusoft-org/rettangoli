// Run with node spec/dialog.viewport.browser.mjs.
// Fault injection reproduces iPad WebKit resolving legacy vw at half width after
// backgrounding, or rejects dvw as an unknown unit in older browsers. Dynamic
// sizing and the legacy fallback must both preserve the open dialog layout.
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium, webkit } from "playwright";

const bundle = await build({
  stdin: {
    contents: `import createDialog from './src/primitives/dialog.js'; customElements.define('rtgl-dialog', createDialog({}));`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "iife",
  write: false,
});
for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const viewportMode of ["normal", "stale", "unsupported"]) {
      const page = await browser.newPage({
        viewport: { width: 1133, height: 744 },
        hasTouch: true,
        isMobile: true,
      });
      await page.setContent(
        '<meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--spacing-lg:16px;--background:white;--border:black;--border-radius-md:8px}body{margin:0}</style>',
      );
      if (viewportMode !== "normal") {
        await page.evaluate((mode) => {
          const replaceSync = CSSStyleSheet.prototype.replaceSync;
          CSSStyleSheet.prototype.replaceSync = function (css) {
            const simulated =
              mode === "stale"
                ? css.replace(
                    /([\d.]+)vw\b/g,
                    (_, value) => `${Number(value) / 2}vw`,
                  )
                : // Keep declarations present: calc() with var() can survive
                  // parsing and invalidate a fallback at computed-value time.
                  css.replaceAll("dvw", "unsupportedviewport");
            return replaceSync.call(this, simulated);
          };
        }, viewportMode);
      }
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page.evaluate(() => {
        const dialog = document.createElement("rtgl-dialog");
        dialog.setAttribute("s", "md");
        dialog.innerHTML =
          '<div slot="content" style="height:100px;">Preview</div>';
        document.body.append(dialog);
        dialog.setAttribute("open", "");
      });
      for (const size of [
        { width: 1133, height: 744 },
        { width: 744, height: 1133 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(size);
        const dialog = page.locator("rtgl-dialog");
        for (const layout of ["", "fixed", "fixed-top"]) {
          await dialog.evaluate((el, layout) => {
            el.setAttribute("layout", layout);
            el.toggleAttribute("bare", layout === "fixed");
            if (layout === "fixed") el.setAttribute("p", "none");
            else el.removeAttribute("p");
          }, layout);
          await dialog.evaluate(async (el) =>
            Promise.all(
              el.shadowRoot
                .querySelector("slot")
                .getAnimations()
                .map((a) => a.finished),
            ),
          );
          const { box, maxWidth } = await dialog.evaluate((el) => {
            const slot = el.shadowRoot.querySelector("slot");
            return {
              box: slot.getBoundingClientRect().toJSON(),
              maxWidth: getComputedStyle(slot).maxWidth,
            };
          });
          const expected =
            layout === "fixed"
              ? size.width
              : size.width <= 768
                ? size.width - 32
                : size.width * 0.5 + (layout === "fixed-top" ? 0 : 34);
          assert.ok(
            Math.abs(box.width - expected) < 1,
            `${name}, viewport=${viewportMode}, ${layout}, ${size.width}: ${box.width} != ${expected}`,
          );
          const expectedMaxWidth =
            layout === "fixed" ? size.width : size.width - 32;
          assert.ok(
            Math.abs(parseFloat(maxWidth) - expectedMaxWidth) < 1,
            `${name}, viewport=${viewportMode}, ${layout}: max-width ${maxWidth} != ${expectedMaxWidth}px`,
          );
          assert.ok(
            Math.abs(box.x + box.width / 2 - size.width / 2) < 1,
            `${name}: dialog stays centered`,
          );
          if (layout === "fixed")
            assert.ok(Math.abs(box.height - size.height) < 1);
        }
      }
      await page.close();
    }
    console.log(
      `${name}: centered/fixed/fixed-top at phone/tablet widths with normal, stale, and unsupported dynamic viewport units passed`,
    );
  } finally {
    await browser.close();
  }
}
