// Run after bun run build:dev: node spec/globalUi.multiline.browser.mjs
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const script = await readFile("vt/static/public/main.js", "utf8");
const baseCss = await readFile("vt/static/public/base.css", "utf8");
const themeCss = await readFile("vt/static/public/theme-rtgl-mono.css", "utf8");
const message =
  "Could not load these assets:\n• Images: Image One\n• Fonts: FontOne-VariableFont_" +
  "long_name_".repeat(12) +
  "\n\nReplace their files with valid copies. <b>Plain text</b>";

await mkdir(".artifacts/multiline-dialogs", { recursive: true });
for (const [engineName, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent(
      '<body class="dark"><rtgl-global-ui></rtgl-global-ui></body>',
    );
    await page.addStyleTag({ content: baseCss + themeCss });
    await page.addScriptTag({ content: script });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const mode of ["Alert", "Confirm"]) {
        for (const title of ["Warning", ""]) {
          await page.locator("rtgl-global-ui").evaluate(
            (element, options) => {
              window.dialogResult = "pending";
              void element.transformedHandlers[`handleShow${options.mode}`]({
                title: options.title,
                message: options.message,
              }).then((result) => {
                window.dialogResult = result;
              });
            },
            { mode, title, message },
          );
          const text = page.locator(".dialog-message");
          await text.waitFor({ state: "visible" });
          const layout = await text.evaluate((element) => {
            const node = element.firstChild;
            const topOf = (value) => {
              const start = node.textContent.indexOf(value);
              const range = document.createRange();
              range.setStart(node, start);
              range.setEnd(node, start + 1);
              return range.getBoundingClientRect().top;
            };
            return {
              text: element.textContent,
              whiteSpace: getComputedStyle(element).whiteSpace,
              first: topOf("• Images"),
              second: topOf("• Fonts"),
              advice: topOf("Replace"),
              fits: element.scrollWidth <= element.clientWidth,
              right: element.getBoundingClientRect().right,
              htmlElements: element.querySelectorAll("b").length,
            };
          });
          assert.equal(layout.text, message);
          assert.equal(layout.whiteSpace, "pre-wrap");
          assert.ok(layout.second > layout.first);
          assert.ok(
            layout.advice > layout.second + (layout.second - layout.first),
          );
          assert.ok(layout.fits);
          assert.ok(layout.right <= width);
          assert.equal(layout.htmlElements, 0);
          if (title && mode === "Alert") {
            await page.locator("#dialog").evaluate(async (element) => {
              const animations = [
                ...element.shadowRoot.querySelectorAll("*"),
              ].flatMap((child) => child.getAnimations());
              await Promise.all(
                animations.map((animation) => animation.finished),
              );
            });
            await page.screenshot({
              path: `.artifacts/multiline-dialogs/${engineName}-${width}.png`,
            });
          }
          await page.locator("#confirmButton").click();
          await page.waitForFunction(() => window.dialogResult !== "pending");
          assert.equal(
            await page.evaluate(() => window.dialogResult),
            mode === "Confirm" ? true : null,
          );
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      `${engineName}: titled and untitled alert/confirm messages preserve lines and wrap at desktop/phone widths`,
    );
  } finally {
    await browser.close();
  }
}
