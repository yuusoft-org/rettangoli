import { describe, expect, it } from "vitest";
import { compileStep, createSteps } from "../src/createSteps.js";
import { replayStep } from "./support/recording-page.js";

// When the step engine throws, relative to the page calls it has already made. The step goldens
// replay one step each; these cases put the error after an earlier nested step.
describe("step engine error timing", () => {
  it("normalizes nested steps before running any of them", async () => {
    const result = await replayStep(createSteps, {
      action: "select",
      testId: "form",
      steps: [{ action: "click" }, { action: "bogus" }],
    });
    expect(result).toEqual({ calls: [], error: 'Unknown structured action: "bogus".' });
  });

  it("parses a legacy block's arguments when the block runs", async () => {
    const result = await replayStep(createSteps, {
      "select form": [{ action: "click" }, { "wait soon": [] }],
    });
    expect(result.calls.map(([path]) => path)).toEqual([
      'getByTestId("form").locator("input, textarea, button, select, a").first().count',
      'getByTestId("form").locator("input, textarea, button, select, a").first().click',
    ]);
    expect(result.error).toBe('Invalid ms: expected a finite number, got "soon".');
  });

  it("rejects an unknown block command when it runs", async () => {
    const step = { "select form": [{ action: "click" }, { "bogus 1": [] }] };
    const result = await replayStep(createSteps, step);
    expect(result.calls).toHaveLength(2);
    expect(result.error).toBe('Unsupported block command: "bogus".');
    expect(() => compileStep(step)).toThrow('Unsupported block command: "bogus".');
  });

  it("runs legacy blocks without a target, even inside a select block", async () => {
    const write = await replayStep(createSteps, { "select form": [{ "write two words": [] }] });
    expect(write.calls).toHaveLength(1);
    expect(write.error).toBe("`write` requires a `select` block target.");

    const nested = await replayStep(createSteps, { "click 10 20": [{ action: "focus" }] });
    expect(nested).toEqual({
      calls: [["mouse.click", 10, 20, { button: "left" }]],
      error: "`focus` requires a `select` block target.",
    });
  });
});

describe("step engine values", () => {
  it("writes the structured value as one string", async () => {
    const result = await replayStep(createSteps, {
      action: "select",
      testId: "name",
      steps: [{ action: "write", value: "two  words" }],
    });
    expect(result.calls.at(-1)).toEqual([
      'getByTestId("name").locator("input, textarea, button, select, a").first().fill',
      "two  words",
    ]);
  });

  it("keeps customEvent detail key order and drops a __proto__ key", async () => {
    const detail = JSON.parse('{"b": 1, "__proto__": "p", "a": "x", "2": null}');
    const result = await replayStep(createSteps, { action: "customEvent", name: "saved", detail });
    expect(result.error).toBeNull();
    const [path, , argument] = result.calls[0];
    expect(path).toBe("evaluate");
    expect(JSON.stringify(argument.payload)).toBe('{"2":"null","b":"1","a":"x"}');
  });

  it("needs both legacy pointer coordinates", async () => {
    for (const name of ["click", "dblclick", "hover", "rclick"]) {
      const result = await replayStep(createSteps, { [`${name} 5`]: [] });
      expect(result).toEqual({
        calls: [],
        error: `\`${name}\` requires a \`select\` block target or \`x y\` coordinates.`,
      });
    }
  });

  it("lists unknown structured keys in order", async () => {
    const step = { action: "click", zz: 1, aa: 2 };
    const message = 'Structured action "click" has unknown keys: zz, aa.';
    expect(await replayStep(createSteps, step)).toEqual({ calls: [], error: message });
    expect(() => compileStep(step)).toThrow(message);
  });
});

describe("assert js equality", () => {
  async function assertJs(actual, value) {
    const { executeStep } = createSteps({ evaluate: async () => actual }, {});
    await executeStep({ action: "assert", type: "js", global: "x", value });
  }

  it("treats 0 and -0 as equal, also inside objects", async () => {
    await expect(assertJs(-0, 0)).resolves.toBeUndefined();
    await expect(assertJs({ a: -0 }, { a: 0 })).resolves.toBeUndefined();
  });

  it("treats NaN as equal to NaN", async () => {
    await expect(assertJs(NaN, NaN)).resolves.toBeUndefined();
    await expect(assertJs([NaN], [NaN])).resolves.toBeUndefined();
  });

  it("still fails on a real difference", async () => {
    await expect(assertJs({ a: 0 }, { a: 1 })).rejects.toThrow(
      'assert js failed: expected {"a":1}, got {"a":0}.',
    );
  });
});
