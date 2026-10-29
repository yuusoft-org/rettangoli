// Run after bun run build:dev: node spec/checkbox.browser.mjs.
// Clicks must reach the checkbox under the pointer, including the native
// input that Playwright tests click, and per-instance styles must keep the
// box, its mark, and its label together.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const script = await readFile("vt/static/public/main.js", "utf8");
const css =
  (await readFile("vt/static/public/base.css", "utf8")) +
  (await readFile("vt/static/public/theme-rtgl-slate.css", "utf8"));
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const markup = `
  <rtgl-view g="xs" p="lg">
    <rtgl-checkbox id="a">Option A</rtgl-checkbox>
    <rtgl-checkbox id="b">Option B</rtgl-checkbox>
    <rtgl-checkbox id="c" indeterminate>Option C</rtgl-checkbox>
    <rtgl-checkbox id="z" z="1" checked aria-label="Raised"></rtgl-checkbox>
    <rtgl-checkbox id="big" wh="28" checked>A 28px box with a label</rtgl-checkbox>
  </rtgl-view>
`;

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
    page.on("pageerror", (error) =>
      failures.push(`${name} pageerror: ${error.message}`),
    );
    await page.setContent("<body></body>");
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: script });
    await page.evaluate((html) => {
      document.body.innerHTML = html;
    }, markup);

    const state = () =>
      page.evaluate(() =>
        ["a", "b", "c"].map((id) => {
          const el = document.getElementById(id);
          return `${id}:${el.checked}/${el.indeterminate}`;
        }).join(" "),
      );

    // The bottom edge of A sits 2px above B; it must toggle A, not B.
    const edge = await page.evaluate(() => {
      const r = document.getElementById("a").shadowRoot
        .querySelector("input").getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.bottom - 1 };
    });
    await page.mouse.click(edge.x, edge.y);
    check(
      (await state()) === "a:true/false b:false/false c:false/true",
      `${name}: clicking the bottom edge of A gave ${await state()}`,
    );

    // Playwright-style click on the native input of an indeterminate box.
    await page.locator("#c input").click({ timeout: 2000 }).catch((error) => {
      failures.push(`${name}: native input click failed: ${error.message.split("\n")[0]}`);
    });
    check(
      (await state()) === "a:true/false b:false/false c:true/false",
      `${name}: clicking C's input gave ${await state()}`,
    );

    const layout = await page.evaluate(() => {
      const big = document.getElementById("big").shadowRoot;
      const box = big.querySelector("input").getBoundingClientRect();
      const label = big.querySelector(".checkbox-label");
      const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
      const raised = document.getElementById("z").shadowRoot;
      return {
        offset:
          box.top + box.height / 2 -
          (label.getBoundingClientRect().top + lineHeight / 2),
        boxSize: [box.width, box.height],
        inputZ: getComputedStyle(raised.querySelector("input")).zIndex,
        controlZ: getComputedStyle(raised.querySelector(".checkbox-control")).zIndex,
      };
    });
    check(
      layout.boxSize.join("x") === "28x28",
      `${name}: wh="28" drew a ${layout.boxSize.join("x")} box`,
    );
    check(
      Math.abs(layout.offset) <= 0.5,
      `${name}: a 28px box is ${layout.offset}px off the label's first line`,
    );
    check(
      layout.inputZ === "auto" && layout.controlZ === "1",
      `${name}: z went to the input (${layout.inputZ}) instead of the box (${layout.controlZ}), hiding the mark`,
    );
    await page.close();
  } finally {
    await browser.close();
  }
}
assert.deepEqual(failures, []);
console.log(
  "Chromium/WebKit: checkbox clicks reach the box under the pointer and its native input, z lifts the box with its mark, and wh boxes center on the label.",
);
