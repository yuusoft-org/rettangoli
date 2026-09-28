// Run after bun run build:dev: node spec/legacy-colors.browser.mjs.
// Unknown colour functions retain var() declarations until computed-value time,
// reproducing browsers without color-mix without modifying the built bundle.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";

const { chromium, webkit } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);
const script = await readFile("vt/static/public/main.js", "utf8");
const css =
  (await readFile("vt/static/public/base.css", "utf8")) +
  (await readFile("vt/static/public/theme-rtgl-mono.css", "utf8"));
const transparent = "rgba(0, 0, 0, 0)";
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const background = (el) => getComputedStyle(el).backgroundColor;
const nativePixels = new Map();
const paintedBackground = async (surface) => {
  const png = PNG.sync.read(await surface.screenshot());
  const offset = (Math.floor(png.height / 2) * png.width + 6) * 4;
  return Array.from(png.data.subarray(offset, offset + 4));
};

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch();
  try {
    for (const legacy of [false, true]) {
      const page = await browser.newPage();
      await page.setContent("<body></body>");
      await page.addStyleTag({ content: css });
      if (legacy) {
        await page.evaluate(() => {
          const replaceSync = CSSStyleSheet.prototype.replaceSync;
          CSSStyleSheet.prototype.replaceSync = function (text) {
            return replaceSync.call(
              this,
              text.replace(/\bcolor-mix\(/g, "unsupported-color("),
            );
          };
        });
      }
      await page.addScriptTag({ content: script });
      await page.evaluate(() => {
        for (const variant of ["default", "pr", "se", "de", "ol", "gh", "lk"]) {
          const button = document.createElement("rtgl-button");
          button.id = variant;
          if (variant !== "default") button.setAttribute("v", variant);
          button.textContent = variant;
          button.style.margin = "12px";
          document.body.append(button);
        }
        const tag = document.createElement("rtgl-tag");
        tag.id = "removable";
        tag.setAttribute("removable", "");
        tag.textContent = "Label";
        document.body.append(tag);
        const tags = document.createElement("rtgl-tag-select");
        tags.id = "tags";
        tags.options = [{ value: "one", label: "Label One" }];
        document.body.append(tags);
      });
      for (const theme of ["light", "dark"]) {
        await page.evaluate(
          (theme) => (document.body.className = theme),
          theme,
        );
        const context = `${name}, ${theme}, ${legacy ? "legacy" : "native"}`;
        for (const variant of ["default", "pr", "se", "de", "ol", "gh", "lk"]) {
          const surface = page.locator(`#${variant} .surface`);
          await page.mouse.move(0, 0);
          const normal = await surface.evaluate(background);
          const normalPixel = await paintedBackground(surface);
          await surface.hover();
          const hover = await surface.evaluate(background);
          const hoverPixel = await paintedBackground(surface);
          await page.mouse.down();
          const active = await surface.evaluate(background);
          const activePixel = await paintedBackground(surface);
          await page.mouse.up();
          if (["default", "pr", "se", "de"].includes(variant)) {
            check(
              hover !== transparent,
              `${context}: ${variant} hover disappeared`,
            );
            check(
              active !== transparent,
              `${context}: ${variant} active disappeared`,
            );
            const pixels = [normalPixel, hoverPixel, activePixel];
            check(
              normalPixel.some((channel, i) => channel !== hoverPixel[i]) &&
                normalPixel.some((channel, i) => channel !== activePixel[i]),
              `${context}: ${variant} must visibly change on hover and press`,
            );
            const key = `${name}/${theme}/${variant}`;
            if (legacy) {
              const expected = nativePixels.get(key);
              check(
                pixels.every((pixel, state) =>
                  pixel.every(
                    (channel, i) => Math.abs(channel - expected[state][i]) <= 1,
                  ),
                ),
                `${context}: ${variant} fallback differs from native painted colours`,
              );
            } else {
              nativePixels.set(key, pixels);
              check(
                hover !== normal && active !== hover,
                `${context}: ${variant} lost mixed hover/active colours`,
              );
            }
          } else {
            // Outline, ghost and link variants must not acquire the fill overlay.
            const key = `${name}/${theme}/${variant}`;
            const pixels = [normalPixel, hoverPixel, activePixel];
            if (legacy) {
              check(
                JSON.stringify(pixels) ===
                  JSON.stringify(nativePixels.get(key)),
                `${context}: ${variant} appearance changed`,
              );
            } else {
              nativePixels.set(key, pixels);
            }
          }
        }
        const remove = page.locator("#removable .removeButton");
        await remove.hover();
        check(
          (await remove.evaluate(background)) !== transparent,
          `${context}: tag removal hover has no highlight`,
        );
        const placeholder = page.locator("#tags #trigger rtgl-tag .surface");
        check(
          (await placeholder.evaluate(background)) !== transparent,
          `${context}: tag placeholder disappeared`,
        );
        await page.locator("#tags").evaluate((el) => (el.open = true));
        const option = page.locator("#tags #option0 rtgl-tag .surface");
        await option.waitFor({ state: "visible" });
        check(
          (await option.evaluate(background)) !== transparent,
          `${context}: unselected tag disappeared`,
        );
        await page.locator("#tags").evaluate((el) => {
          el.open = false;
          el.selectedValues = ["one"];
        });
        await page.locator("#tags #trigger").getByText("Label One").waitFor();
        check(
          (await placeholder.evaluate(background)) !== transparent,
          `${context}: selected tag disappeared`,
        );
        await page.locator("#tags").evaluate((el) => (el.selectedValues = []));
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
assert.deepEqual(failures, []);
console.log(
  "Chromium/WebKit: button hover/active and tag colours pass in light/dark themes, with and without color-mix.",
);
