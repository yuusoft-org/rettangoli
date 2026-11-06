// Golden characterization of cli.js: every scenario in support/scenarios.js is
// run against recording fakes of the @rettangoli/* packages and compared with
// test/golden/<group>.json (exit code, stdout, key stderr lines, and every
// package import and call with its arguments).
//
//   RTGL_GOLDEN_UPDATE=1 node --test test/cli-golden.test.js   rewrite goldens
//   CLI_UNDER_TEST=<dir> node --test test/cli-golden.test.js   test another
//       checkout of packages/rettangoli-cli (for example an unmodified checkout)
//   RTGL_RUNTIME=<path> node --test test/cli-golden.test.js    run cli.js with
//       another JavaScript runtime (for example bun). The runtime renders
//       uncaught errors itself, so that pass skips the stderr fields.
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { serialize } from "./fixtures/fake-packages/trace.js";
import {
  formatGolden,
  hasStackFrames,
  runScenario,
  summarizeStderr,
} from "./support/cli-harness.js";
import { groups, scenarios } from "./support/scenarios.js";

const goldenDirectory = join(dirname(fileURLToPath(import.meta.url)), "golden");
const CONCURRENCY = 8;
const UPDATE = process.env.RTGL_GOLDEN_UPDATE === "1";
const RUNTIME_OVERRIDDEN = Boolean(process.env.RTGL_RUNTIME);

// Scenarios whose stderr must keep at least one significant line, so a summary
// filter that drops everything cannot go unnoticed.
const STDERR_MUST_BE_SUMMARIZED = new Set(["fe-build-dirs-number", "fe-package-missing"]);

function goldenPath(group) {
  return join(goldenDirectory, `${group}.json`);
}

async function runChecked(scenario) {
  const result = await runScenario(scenario);
  if (STDERR_MUST_BE_SUMMARIZED.has(scenario.id)) {
    assert.notEqual(result.stderrSummary.length, 0, `${scenario.id} has an empty stderr summary`);
  }
  return result;
}

function withoutRuntimeSpecificFields(result) {
  if (!RUNTIME_OVERRIDDEN) {
    return result;
  }
  const { stderrSummary, stderrHasStack, ...rest } = result;
  return rest;
}

async function updateGolden(group, groupScenarios) {
  const results = {};
  const queue = [...groupScenarios];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let scenario = queue.shift(); scenario; scenario = queue.shift()) {
        results[scenario.id] = await runChecked(scenario);
      }
    }),
  );

  const previous = existsSync(goldenPath(group))
    ? JSON.parse(readFileSync(goldenPath(group), "utf8"))
    : {};
  const ids = new Set([...Object.keys(previous), ...Object.keys(results)]);
  const changed = [...ids]
    .sort()
    .map((id) => {
      if (!(id in previous)) return `  + ${id}`;
      if (!(id in results)) return `  - ${id}`;
      return formatGolden(previous[id]) === formatGolden(results[id]) ? null : `  ~ ${id}`;
    })
    .filter(Boolean);
  console.log(
    `golden ${group}: ${changed.length === 0 ? "unchanged" : `\n${changed.join("\n")}`}`,
  );
  writeFileSync(goldenPath(group), formatGolden(results));
}

test("scenario ids are unique and belong to a known group", () => {
  const ids = scenarios.map((scenario) => scenario.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const scenario of scenarios) {
    assert.ok(groups.includes(scenario.group), `${scenario.id}: unknown group ${scenario.group}`);
  }
});

for (const group of groups) {
  test(`cli golden: ${group}`, { concurrency: CONCURRENCY }, async (t) => {
    const groupScenarios = scenarios.filter((scenario) => scenario.group === group);

    if (UPDATE) {
      assert.ok(!RUNTIME_OVERRIDDEN, "unset RTGL_RUNTIME to update goldens");
      await updateGolden(group, groupScenarios);
      return;
    }

    assert.ok(
      existsSync(goldenPath(group)),
      `missing ${goldenPath(group)}; run with RTGL_GOLDEN_UPDATE=1`,
    );
    const golden = JSON.parse(readFileSync(goldenPath(group), "utf8"));
    assert.deepStrictEqual(
      Object.keys(golden).sort(),
      groupScenarios.map((scenario) => scenario.id).sort(),
      "golden file and scenario list differ; run with RTGL_GOLDEN_UPDATE=1",
    );

    await Promise.all(
      groupScenarios.map((scenario) =>
        t.test(scenario.id, async () => {
          const actual = JSON.parse(JSON.stringify(await runChecked(scenario)));
          assert.deepStrictEqual(
            withoutRuntimeSpecificFields(actual),
            withoutRuntimeSpecificFields(golden[scenario.id]),
          );
        }),
      ),
    );
  });
}

test("trace serialization keeps values JSON would lose", () => {
  assert.deepStrictEqual(
    serialize({
      b: undefined,
      a: [Number.NaN, -0, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, null],
      fn: function createSource() {},
    }),
    {
      a: [
        { $number: "NaN" },
        { $number: "-0" },
        { $number: "Infinity" },
        { $number: "-Infinity" },
        0,
        null,
      ],
      b: { $undefined: true },
      fn: { $fn: "createSource" },
    },
  );
  assert.deepStrictEqual(Object.keys(serialize({ z: 1, a: 2, m: 3 })), ["a", "m", "z"]);
  const cycle = {};
  cycle.self = cycle;
  assert.deepStrictEqual(serialize(cycle), { self: { $circular: true } });
});

test("stderr summary keeps error lines and drops stack noise", () => {
  const stderr = [
    "file:///app/node_modules/rtgl/cli.js:107",
    '      throw new Error("rettangoli.config.yaml not found");',
    "            ^",
    "",
    "Error: rettangoli.config.yaml not found",
    "    at Command.<anonymous> (file:///app/node_modules/rtgl/cli.js:107:13)",
    "    at async Promise.all (index 0) {",
    "  [cause]: Error: fake cause",
    "      at file:///app/x.js:1:1",
    "}",
    "TypeError [ERR_INVALID_ARG_TYPE]: The \"paths[1]\" argument must be of type string.",
    "  code: 'ERR_INVALID_ARG_TYPE'",
    "rtgl: warning: something",
    "error: unknown command 'bogus'",
    "fake build rejection",
    "",
    "Node.js v24.0.0",
  ].join("\n");

  assert.deepStrictEqual(summarizeStderr(stderr), [
    "Error: rettangoli.config.yaml not found",
    "  [cause]: Error: fake cause",
    'TypeError [ERR_INVALID_ARG_TYPE]: The "paths[1]" argument must be of type string.',
    "  code: 'ERR_INVALID_ARG_TYPE'",
    "rtgl: warning: something",
    "error: unknown command 'bogus'",
    "fake build rejection",
  ]);
  assert.equal(hasStackFrames(stderr), true);
  assert.equal(hasStackFrames("error: unknown command 'bogus'\n"), false);
});
