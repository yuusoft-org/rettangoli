// Run after bun run build:dev: node spec/legacy-colors.browser.mjs.
// Renaming color-mix( to unsupported-color( in constructed stylesheets
// reproduces browsers without color-mix: plain declarations drop at parse
// time while var() ones only invalidate at computed-value time.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import { chromium, webkit } from "playwright";

const script = await readFile("vt/static/public/main.js", "utf8");
const css =
  (await readFile("vt/static/public/base.css", "utf8")) +
  (await readFile("vt/static/public/theme-rtgl-mono.css", "utf8"));
const transparent = "rgba(0, 0, 0, 0)";
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const backgroundImage = (el) => getComputedStyle(el).backgroundImage;
const nativePixels = new Map();
const nativeTagAppearances = new Map();
const buttons = [
  { id: "default", filled: true },
  { id: "pr", v: "pr", filled: true },
  { id: "se", v: "se", filled: true },
  { id: "de", v: "de", filled: true },
  { id: "link", href: "#", filled: true },
  { id: "ol", v: "ol" },
  { id: "gh", v: "gh" },
  { id: "lk", v: "lk" },
  { id: "hover-gh", hv: "gh" },
  { id: "sm-gh", v: "pr", smv: "gh" },
];
const pixelAt = (png, x, y) => {
  const offset = (y * png.width + x) * 4;
  return Array.from(png.data.subarray(offset, offset + 3));
};
const paintedBackground = async (surface) => {
  const png = PNG.sync.read(await surface.screenshot());
  return pixelAt(png, 6, Math.floor(png.height / 2));
};
const removeXContrast = async (button) => {
  const png = PNG.sync.read(await button.screenshot());
  const cx = Math.floor(png.width / 2);
  const cy = Math.floor(png.height / 2);
  const background = pixelAt(png, cx, Math.round(cy - png.height * 0.35));
  let contrast = 0;
  for (let x = cx - 1; x <= cx + 1; x++) {
    for (let y = cy - 1; y <= cy + 1; y++) {
      contrast = Math.max(
        contrast,
        ...pixelAt(png, x, y).map(
          (channel, index) => Math.abs(channel - background[index]),
        ),
      );
    }
  }
  return contrast;
};
const comparePixels = (key, context, pixels, tolerance) => {
  const expected = nativePixels.get(key);
  if (!expected) {
    nativePixels.set(key, pixels);
    return;
  }
  check(
    pixels.every((pixel, state) =>
      pixel.every(
        (channel, index) => Math.abs(channel - expected[state][index]) <= tolerance,
      ),
    ),
    `${context}: fallback differs from native painted colours`,
  );
};

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const legacy of [false, true]) {
      const page = await browser.newPage({
        viewport: { width: 600, height: 1000 },
      });
      page.on("pageerror", (error) =>
        failures.push(
          `${name}, ${legacy ? "legacy" : "native"} pageerror: ${error.message}`,
        ),
      );
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
      await page.evaluate((buttons) => {
        for (const { id, v, href, hv, smv } of buttons) {
          const button = document.createElement("rtgl-button");
          button.id = id;
          if (v) button.setAttribute("v", v);
          if (href) button.setAttribute("href", href);
          if (hv) button.setAttribute("h-v", hv);
          if (smv) button.setAttribute("sm-v", smv);
          button.textContent = id;
          button.style.margin = "12px";
          document.body.append(button);
        }
        for (const variant of ["default", "pr", "de"]) {
          const tag = document.createElement("rtgl-tag");
          tag.id = `removable-${variant}`;
          tag.setAttribute("removable", "");
          if (variant !== "default") tag.setAttribute("v", variant);
          tag.textContent = "Label";
          document.body.append(tag);
        }
        const carousel = document.createElement("rtgl-carousel");
        carousel.id = "carousel";
        carousel.setAttribute("pager", "");
        for (let slide = 1; slide <= 3; slide++) {
          const element = document.createElement("div");
          element.textContent = `Slide ${slide}`;
          carousel.append(element);
        }
        document.body.append(carousel);
        const tags = document.createElement("rtgl-tag-select");
        tags.id = "tags";
        tags.options = [{ value: "one", label: "Label One" }];
        document.body.append(tags);
      }, buttons);
      await page.locator("#carousel #pager button").nth(2).waitFor();
      for (const theme of ["light", "dark"]) {
        await page.evaluate(
          (theme) => (document.body.className = theme),
          theme,
        );
        const context = `${name}, ${theme}, ${legacy ? "legacy" : "native"}`;
        for (const { id, filled } of buttons) {
          const surface = page.locator(`#${id} .surface`);
          await page.mouse.move(0, 0);
          const pixels = [await paintedBackground(surface)];
          const overlayFree = [];
          await surface.hover();
          pixels.push(await paintedBackground(surface));
          overlayFree.push(await surface.evaluate(backgroundImage));
          await page.mouse.down();
          pixels.push(await paintedBackground(surface));
          overlayFree.push(await surface.evaluate(backgroundImage));
          await page.mouse.up();
          const key = `${name}/${theme}/${id}`;
          if (filled) {
            const alphas = [0, 0.15, 0.2];
            check(
              pixels.every((pixel, state) =>
                pixel.every(
                  (channel, index) =>
                    Math.abs(
                      channel -
                        Math.round(
                          (1 - alphas[state]) * pixels[0][index] +
                            alphas[state] * 255,
                        ),
                    ) <= 2,
                ),
              ),
              `${context}: ${id} hover/active must tint the fill 15%/20% white`,
            );
            comparePixels(key, context, pixels, 1);
          } else {
            // Outline, ghost and link variants must not acquire the fill
            // overlay, including through h-v and sm-v attributes.
            check(
              overlayFree.every((image) => image === "none"),
              `${context}: ${id} acquired the hover overlay`,
            );
            comparePixels(key, context, pixels, 0);
          }
        }
        for (const variant of ["default", "pr", "de"]) {
          const remove = page.locator(`#removable-${variant} .removeButton`);
          await remove.hover();
          check(
            (await removeXContrast(remove)) >= 40,
            `${context}: removable ${variant} tag X disappears on hover`,
          );
        }
        const pager = await page.locator("#carousel").evaluate((element) => {
          const dots = [...element.shadowRoot.querySelectorAll("#pager button")];
          const read = (dot) => {
            const style = getComputedStyle(dot);
            return {
              backgroundColor: style.backgroundColor,
              borderStyle: style.borderTopStyle,
              borderWidth: style.borderTopWidth,
            };
          };
          const active = dots.find((dot) => dot.classList.contains("is-active"));
          const inactive = dots.find(
            (dot) => !dot.classList.contains("is-active"),
          );
          return {
            count: dots.length,
            active: read(active),
            inactive: read(inactive),
          };
        });
        check(pager.count === 3, `${context}: carousel pager dots missing`);
        check(
          pager.inactive.borderStyle === "solid" &&
            parseFloat(pager.inactive.borderWidth) > 0 &&
            pager.inactive.backgroundColor !== transparent,
          `${context}: inactive pager dot lost its border and background`,
        );
        check(
          pager.active.backgroundColor !== pager.inactive.backgroundColor,
          `${context}: active pager dot matches an inactive dot`,
        );
        const checkTagAppearance = async (surface, state, selected) => {
          const appearance = await surface.evaluate((el) => {
            const style = getComputedStyle(el);
            return {
              background: style.backgroundColor,
              borderColor: style.borderTopColor,
              borderStyle: style.borderTopStyle,
              borderWidth: style.borderTopWidth,
              color: style.color,
            };
          });
          check(
            selected
              ? appearance.background !== transparent
              : appearance.background === transparent,
            `${context}: ${state} must be ${selected ? "filled" : "transparent"}`,
          );
          check(
            appearance.borderColor !== transparent &&
              appearance.borderStyle === "solid" &&
              parseFloat(appearance.borderWidth) > 0,
            `${context}: ${state} lost its outline`,
          );
          const actual = {
            ...appearance,
            pixel: await paintedBackground(surface),
          };
          const key = `${name}/${theme}/${state}`;
          if (legacy) {
            check(
              JSON.stringify(actual) ===
                JSON.stringify(nativeTagAppearances.get(key)),
              `${context}: ${state} fallback differs from native appearance`,
            );
          } else {
            nativeTagAppearances.set(key, actual);
          }
        };
        const trigger = page.locator("#tags #trigger");
        const triggerTag = trigger.locator("rtgl-tag .surface");
        await checkTagAppearance(triggerTag, "tag placeholder", false);
        await trigger.click();
        const option = page.locator("#tags #option0 rtgl-tag .surface");
        await option.waitFor({ state: "visible" });
        await checkTagAppearance(option, "unselected tag", false);
        await option.click();
        await page.locator('#tags #option0[aria-pressed="true"]').waitFor();
        await checkTagAppearance(option, "selected option", true);
        await option.click();
        await page.locator('#tags #option0[aria-pressed="false"]').waitFor();
        await checkTagAppearance(option, "deselected option", false);
        await option.click();
        await page.locator('#tags #option0[aria-pressed="true"]').waitFor();
        await page.locator("#tags #submitButton").click();
        await trigger.getByText("Label One").waitFor();
        await checkTagAppearance(triggerTag, "selected trigger tag", true);
        await page.locator("#tags").evaluate((el) => (el.selectedValues = []));
        await trigger.getByText("Add tag").waitFor();
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
assert.deepEqual(failures, []);
console.log(
  "Chromium/WebKit: button overlays, removable tag X, carousel dots and tag-select colours pass in light/dark themes, with and without color-mix.",
);
