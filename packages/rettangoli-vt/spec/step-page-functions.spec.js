import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// The step engine passes three functions to `evaluate`; they run in the page. Playwright puts the
// page-side stack into error messages, with line:column inside these functions (for example
// "Expected function at window.x.\n    at eval (..., <anonymous>:17:17)"), so their exact source
// text, indentation included, is user-visible. Vitest rewrites function sources (the step golden
// hashes them whitespace-normalized), so this records them in a plain node child process.
const SCRIPT = `
const { createSteps } = await import(process.argv[1]);
const sources = {};
const context = {
  evaluate: async (target, fn, arg, label) => {
    sources[label] = Function.prototype.toString.call(fn);
    return 1;
  },
};
const element = { count: async () => 1, first: () => element, locator: () => element };
const steps = createSteps({ getByTestId: () => element }, context);
await steps.executeStep({ action: "select", testId: "field", steps: [{ action: "blur" }] });
await steps.executeStep({ action: "customEvent", name: "ready" });
await steps.executeStep({ action: "assert", type: "js", global: "ready", value: 1 });
process.stdout.write(JSON.stringify(sources));
`;

const lines = (...text) => text.join("\n");

const PAGE_FUNCTIONS = {
  blur: "(element) => element.blur()",
  'customEvent "ready"': lines(
    "({ eventName, payload }) => {",
    "    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));",
    "  }",
  ),
  "assert js": lines(
    "async ({ globalPath, fnPath, fnArgs }) => {",
    "        const resolvePath = (root, dottedPath) => {",
    '          return dottedPath.split(".").reduce((acc, key) => {',
    "            if (acc === null || acc === undefined) {",
    "              return undefined;",
    "            }",
    "            return acc[key];",
    "          }, root);",
    "        };",
    "",
    "        if (globalPath) {",
    "          return resolvePath(window, globalPath);",
    "        }",
    "",
    "        const fn = resolvePath(window, fnPath);",
    '        if (typeof fn !== "function") {',
    "          throw new Error(`Expected function at window.${fnPath}.`);",
    "        }",
    "        return await fn(...fnArgs);",
    "      }",
  ),
};

describe("step engine page functions", () => {
  it("keep their exact source text, indentation included", () => {
    const createStepsUrl = new URL("../src/createSteps.js", import.meta.url).href;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", SCRIPT, createStepsUrl], {
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(PAGE_FUNCTIONS);
  });
});
