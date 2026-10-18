// Run after bun run build:dev: node spec/button-disabled.browser.mjs.
// Disabled buttons must look different from enabled ones without relying on
// the cursor, which touch devices never show, and must not react to hover.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const script = await readFile("vt/static/public/main.js", "utf8");
const css =
  (await readFile("vt/static/public/base.css", "utf8")) +
  (await readFile("vt/static/public/theme-rtgl-mono.css", "utf8"));
const variants = ["default", "pr", "se", "de", "ol", "gh", "lk"];
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const readSurface = (surface) =>
  surface.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      opacity: style.opacity,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      textDecorationLine: style.textDecorationLine,
    };
  });

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 600, height: 800 } });
    page.on("pageerror", (error) =>
      failures.push(`${name} pageerror: ${error.message}`),
    );
    await page.setContent("<body></body>");
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: script });
    await page.evaluate((variants) => {
      for (const variant of variants) {
        for (const disabled of [false, true]) {
          const button = document.createElement("rtgl-button");
          button.id = `${variant}-${disabled ? "disabled" : "enabled"}`;
          if (variant !== "default") button.setAttribute("v", variant);
          if (disabled) button.setAttribute("disabled", "");
          button.setAttribute("pre", "text");
          button.textContent = variant;
          button.style.margin = "8px";
          document.body.append(button);
        }
      }
    }, variants);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => (document.body.className = theme), theme);
      for (const variant of variants) {
        const context = `${name}, ${theme}, ${variant}`;
        const enabled = page.locator(`#${variant}-enabled .surface`);
        const disabled = page.locator(`#${variant}-disabled .surface`);
        await page.mouse.move(0, 0);
        const enabledRest = await readSurface(enabled);
        const disabledRest = await readSurface(disabled);
        check(enabledRest.opacity === "1", `${context}: enabled is dimmed`);
        check(disabledRest.opacity === "0.5", `${context}: disabled is not dimmed`);
        await disabled.hover({ force: true });
        check(
          JSON.stringify(await readSurface(disabled)) ===
            JSON.stringify(disabledRest),
          `${context}: disabled reacts to hover`,
        );
        await enabled.hover();
        const enabledHover = await readSurface(enabled);
        check(
          JSON.stringify(enabledHover) !== JSON.stringify(enabledRest),
          `${context}: enabled lost its hover feedback`,
        );
      }
    }
    await page.close();
  } finally {
    await browser.close();
  }
}
assert.deepEqual(failures, []);
console.log(
  "Chromium/WebKit: disabled buttons are dimmed and ignore hover in every variant, light and dark.",
);
