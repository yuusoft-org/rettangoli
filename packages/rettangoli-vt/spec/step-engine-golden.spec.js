import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileStep, createSteps } from "../src/createSteps.js";
import { PERSONALITIES, replayStep } from "./support/recording-page.js";
import { STEP_GOLDEN_DIR, loadStepCases } from "./support/record-goldens.mjs";

const cases = loadStepCases();
const golden = JSON.parse(readFileSync(resolve(STEP_GOLDEN_DIR, "golden.json"), "utf8"));

const STRUCTURED_ACTIONS = [
  "assert", "blur", "check", "clear", "click", "customEvent", "dblclick", "focus", "goto", "hover",
  "keypress", "mouseDown", "mouseUp", "move", "rclick", "rightMouseDown", "rightMouseUp", "scroll",
  "select", "selectOption", "setViewport", "screenshot", "uncheck", "upload", "wait", "waitFor", "write",
];

function collectUsage(value, usage = { actions: new Set(), assertTypes: new Set(), matchModes: new Set() }) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectUsage(entry, usage));
  } else if (value !== null && typeof value === "object") {
    if (typeof value.action === "string") {
      usage.actions.add(value.action);
    }
    if (value.action === "assert" || "assert" in value) {
      const config = value.action === "assert" ? value : value.assert;
      if (typeof config?.type === "string") usage.assertTypes.add(config.type);
      if (typeof config?.match === "string") usage.matchModes.add(config.match);
    }
    Object.values(value).forEach((entry) => collectUsage(entry, usage));
  }
  return usage;
}

describe("step engine golden", () => {
  it("covers every structured action, assert type and match mode", () => {
    const usage = collectUsage(cases.map((entry) => entry.step));
    expect([...usage.actions].filter((action) => STRUCTURED_ACTIONS.includes(action)).sort()).toEqual(
      [...STRUCTURED_ACTIONS].sort(),
    );
    expect([...usage.assertTypes].sort()).toEqual(expect.arrayContaining(["exists", "hidden", "js", "text", "url", "visible"]));
    expect([...usage.matchModes].sort()).toEqual(expect.arrayContaining(["equals"]));
  });

  it("has a golden entry for every case and nothing else", () => {
    const expected = {};
    for (const entry of cases) {
      expected[entry.id] = entry.personalities ?? ["default"];
    }
    const actual = {};
    for (const [id, byPersonality] of Object.entries(golden)) {
      actual[id] = Object.keys(byPersonality);
    }
    expect(actual).toEqual(expected);
  });

  it("only uses known personalities and bug tags", () => {
    for (const entry of cases) {
      for (const personality of entry.personalities ?? ["default"]) {
        expect(Object.keys(PERSONALITIES), entry.id).toContain(personality);
      }
      if (entry.bug !== undefined) {
        expect(["custom-event-detail", "validation-drift", "goto-relative"], entry.id).toContain(entry.bug);
      }
    }
  });

  it("compileStep rejects a case only with the error every personality records", () => {
    const mismatches = [];
    let rejected = 0;
    for (const entry of cases) {
      let message = null;
      try {
        compileStep(structuredClone(entry.step));
      } catch (error) {
        message = error.message;
      }
      if (message === null) continue;
      rejected += 1;
      for (const personality of entry.personalities ?? ["default"]) {
        if (golden[entry.id][personality].error !== message) {
          mismatches.push({ id: entry.id, personality, compile: message, runtime: golden[entry.id][personality].error });
        }
      }
    }
    expect(mismatches).toEqual([]);
    expect(rejected).toBeGreaterThan(0);
  });

  for (const entry of cases) {
    for (const personality of entry.personalities ?? ["default"]) {
      it(`${entry.id} [${personality}]`, async () => {
        const result = await replayStep(createSteps, entry.step, { personality });
        expect(result).toEqual(golden[entry.id][personality]);
      });
    }
  }
});
