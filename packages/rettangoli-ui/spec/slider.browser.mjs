// Run with node spec/slider.browser.mjs.
// rtgl-slider must show its value attribute clamped and
// rounded to the min/max/step it ends up with, whatever order the attributes
// change in. Real engines also round to the step and re-clamp when the bounds
// change, which jsdom does not (see slider.primitive.spec.js).
import assert from "node:assert/strict";
import {
  bundle,
  collectPageErrors,
  forEachEngine,
  newThemedPage,
} from "./support/browserHarness.mjs";

const script = await bundle(`
  import createSlider from "./src/primitives/slider.js";
  customElements.define("rtgl-slider", createSlider({}));
`);

// [name, initial attributes, attribute updates after connecting, expected value]
const cases = [
  ["max before value in one update", [["max", "100"], ["value", "50"]], [["max", "200"], ["value", "150"]], "150"],
  ["value then max on a connected slider", [], [["value", "500"], ["max", "1000"]], "500"],
  ["value before max in one update", [["max", "100"], ["value", "50"]], [["value", "150"], ["max", "200"]], "150"],
  ["max grows past an out-of-range value", [["max", "100"], ["value", "150"]], [["max", "200"]], "150"],
  ["min drops past an out-of-range value", [["min", "0"], ["value", "-50"]], [["min", "-100"]], "-50"],
  ["step becomes finer", [["step", "1"], ["value", "0.5"]], [["step", "0.1"]], "0.5"],
  ["max shrinks", [["max", "100"], ["value", "50"]], [["max", "40"]], "40"],
  ["max shrinks, then grows back", [["max", "100"], ["value", "50"]], [["max", "40"], ["max", "100"]], "50"],
];

await forEachEngine(async ({ name, browser }) => {
  const page = await newThemedPage(browser);
  const errors = collectPageErrors(page);
  await page.addScriptTag({ content: script });

  const results = await page.evaluate((cases) =>
    cases.map(([, initial, updates]) => {
      const slider = document.createElement("rtgl-slider");
      for (const [attr, value] of initial) slider.setAttribute(attr, value);
      document.body.append(slider);
      for (const [attr, value] of updates) slider.setAttribute(attr, value);
      return [slider.shadowRoot.querySelector("input").value, slider.value];
    }), cases);

  // [inner input value, slider.value] for every case that is off.
  const wrong = cases.flatMap(([label, , , expected], index) =>
    results[index].every((value) => value === expected)
      ? []
      : [`${label}: expected ${expected}, got ${results[index]}`]);
  assert.deepEqual(wrong, [], `${name}: inner value and slider.value`);
  assert.deepEqual(errors, [], `${name}: page errors`);
  await page.close();
  console.log(`${name}: slider values follow the current min/max/step in ${cases.length} update orders`);
});
