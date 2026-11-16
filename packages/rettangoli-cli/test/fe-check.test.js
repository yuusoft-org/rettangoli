// The reporter behind the [Check] lines of `rtgl fe build` and `rtgl fe watch`,
// against a fake checker and a fake file watcher. The real checker and a real
// build are covered by test/fe-check.integration.test.js.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { test } from "node:test";
import { MAX_LISTED_DIAGNOSTICS, createFeCheckReporter } from "../src/fe-check.js";

const CWD = join("/", "project");
const DEBOUNCE_MS = 20;

const diagnostic = (code, line = 1, severity = "error") => ({
  code,
  severity,
  message: `${code} message`,
  filePath: join(CWD, "src", "components", "card", "card.view.yaml"),
  line,
});

function outcome(diagnostics) {
  const error = diagnostics.filter(({ severity }) => severity === "error").length;
  const warn = diagnostics.length - error;
  return {
    result: { summary: { total: diagnostics.length, bySeverity: { error, warn } }, diagnostics },
    report: `report(${diagnostics.map(({ code, line }) => `${code}@${line}`).join(",")})`,
  };
}

const componentFile = join(CWD, "src", "components", "card", "card.view.yaml");

const summaryLine = (error, warn) =>
  `[Check] ${error} error(s), ${warn} warning(s). These do not fail the build. ` +
  "Run `rtgl check` for the full report and to fail CI on them.";

// A reporter whose checker returns `state.diagnostics`, or throws `state.failure`.
function setup({ dirs = ["src/components"], runCheck } = {}) {
  const state = { diagnostics: [], failure: null, loads: 0, creates: [], runs: 0 };
  const output = [];
  const reporter = createFeCheckReporter({
    load: async (specifier) => {
      state.loads += 1;
      assert.equal(specifier, "@rettangoli/check/cli");
      return {
        createChecker: (options) => {
          state.creates.push(options);
          return (
            runCheck ??
            (async () => {
              state.runs += 1;
              if (state.failure) throw state.failure;
              return outcome(state.diagnostics);
            })
          );
        },
      };
    },
    cwd: CWD,
    dirs,
    write: (text) => output.push(`${text}\n`),
    debounceMs: DEBOUNCE_MS,
  });
  return { state, output, reporter };
}

test("a project without diagnostics prints nothing", async () => {
  const { state, output, reporter } = setup();
  await reporter.run();

  assert.deepEqual(output, []);
  assert.deepEqual(state.creates, [
    { cwd: CWD, dirs: ["src/components"], maxDiagnostics: MAX_LISTED_DIAGNOSTICS },
  ]);
  assert.equal(MAX_LISTED_DIAGNOSTICS, 10);
});

test("diagnostics print the checker's report and one summary line", async () => {
  const { state, output, reporter } = setup();
  state.diagnostics = [diagnostic("A"), diagnostic("B"), diagnostic("C", 3, "warn")];
  await reporter.run();

  assert.deepEqual(output, [`report(A@1,B@1,C@3)\n${summaryLine(2, 1)}\n`]);
});

test("warnings alone are reported too", async () => {
  const { state, output, reporter } = setup();
  state.diagnostics = [diagnostic("W", 1, "warn")];
  await reporter.run();

  assert.deepEqual(output, [`report(W@1)\n${summaryLine(0, 1)}\n`]);
});

test("a report is printed again only when the diagnostics change", async () => {
  const { state, output, reporter } = setup();
  state.diagnostics = [diagnostic("A", 4)];
  await reporter.run();
  await reporter.run();
  assert.equal(output.length, 1, "an unchanged report is not printed twice");

  // The same diagnostic on another line: an edit above it moved it.
  state.diagnostics = [diagnostic("A", 9)];
  await reporter.run();
  assert.equal(output.length, 1, "a moved diagnostic is not printed again");

  state.diagnostics = [diagnostic("A", 9), diagnostic("B", 2)];
  await reporter.run();
  assert.equal(output.at(-1), `report(A@9,B@2)\n${summaryLine(2, 0)}\n`);

  // Same codes and messages, different severity.
  state.diagnostics = [diagnostic("A", 9), diagnostic("B", 2, "warn")];
  await reporter.run();
  assert.equal(output.at(-1), `report(A@9,B@2)\n${summaryLine(1, 1)}\n`);
  assert.equal(output.length, 3);

  // The same diagnostics in another order (two template lines swapped).
  state.diagnostics = [diagnostic("B", 2, "warn"), diagnostic("A", 9)];
  await reporter.run();
  assert.equal(output.length, 3, "reordered diagnostics are not printed again");

  // One more of a diagnostic that is already there is a change.
  state.diagnostics = [diagnostic("A", 9), diagnostic("A", 12), diagnostic("B", 2, "warn")];
  await reporter.run();
  assert.equal(output.at(-1), `report(A@9,A@12,B@2)\n${summaryLine(2, 1)}\n`);
  state.diagnostics = [diagnostic("A", 9), diagnostic("B", 2, "warn")];
  await reporter.run();
  assert.equal(output.at(-1), `report(A@9,B@2)\n${summaryLine(1, 1)}\n`);
  assert.equal(output.length, 5);

  // Fixed: the clean report is printed once, without the summary line.
  state.diagnostics = [];
  await reporter.run();
  await reporter.run();
  assert.equal(output.at(-1), "report()\n");
  assert.equal(output.length, 6);
  assert.equal(state.loads, 1);
  assert.equal(state.creates.length, 1, "one checker serves every run");
});

test("a checker failure prints one line and never rejects", async () => {
  const { state, output, reporter } = setup();
  state.failure = new Error("bad project\n    at somewhere (file.js:1:1)");
  await reporter.run();
  await reporter.run();
  assert.deepEqual(output, ["[Check] Could not run the contract check: bad project\n"]);

  state.failure = "a string, not an Error";
  await reporter.run();
  assert.equal(output.at(-1), "[Check] Could not run the contract check: a string, not an Error\n");

  state.failure = new Error("");
  await reporter.run();
  assert.equal(output.at(-1), "[Check] Could not run the contract check: unknown error\n");

  // The checker works again: diagnostics are reported as usual.
  state.failure = null;
  state.diagnostics = [diagnostic("A")];
  await reporter.run();
  assert.equal(output.at(-1), `report(A@1)\n${summaryLine(1, 0)}\n`);
});

test("a package that cannot be loaded or created is retried on the next run", async () => {
  const output = [];
  let attempts = 0;
  const reporter = createFeCheckReporter({
    load: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("Cannot find package '@rettangoli/check'");
      return {
        createChecker: () => {
          if (attempts === 2) throw new Error("Failed to read rettangoli.config.yaml: bad");
          return async () => outcome([diagnostic("A")]);
        },
      };
    },
    cwd: CWD,
    dirs: ["src/components"],
    write: (text) => output.push(`${text}\n`),
  });

  await reporter.run();
  await reporter.run();
  await reporter.run();
  assert.deepEqual(output, [
    "[Check] Could not run the contract check: Cannot find package '@rettangoli/check'\n",
    "[Check] Could not run the contract check: Failed to read rettangoli.config.yaml: bad\n",
    `report(A@1)\n${summaryLine(1, 0)}\n`,
  ]);
});

// A closed pipe does not make `write` throw (the default is console.log, which
// ignores it; test/fe-check.integration.test.js covers that with a real
// pipe). This covers the remaining case: a failure inside a run, here a `write`
// that throws synchronously, must not reject, must not leave the reporter
// stuck in "running", and must not surface as an unhandled rejection when the
// run was started by the watch timer.
test("a failure inside a run does not reject or block later runs", async () => {
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);
  try {
    const output = [];
    let failWrites = true;
    let diagnostics = [diagnostic("A")];
    let runs = 0;
    const reporter = createFeCheckReporter({
      load: async () => ({
        createChecker: () => async () => {
          runs += 1;
          return outcome(diagnostics);
        },
      }),
      cwd: CWD,
      dirs: ["src/components"],
      write: (text) => {
        if (failWrites) throw new Error("write failed");
        output.push(text);
      },
      debounceMs: DEBOUNCE_MS,
    });
    const watcher = new EventEmitter();
    reporter.watch(watcher);

    await reporter.run();
    assert.equal(runs, 1);

    // Started by the watch timer, failing again.
    diagnostics = [diagnostic("A"), diagnostic("B")];
    watcher.emit("all", "change", componentFile);
    await sleep(DEBOUNCE_MS * 5);
    assert.equal(runs, 2, "the reporter was not left running after the first failure");

    // The output works again: runs and prints as usual.
    failWrites = false;
    diagnostics = [diagnostic("C")];
    watcher.emit("all", "change", componentFile);
    await sleep(DEBOUNCE_MS * 5);
    assert.equal(runs, 3);
    await reporter.run();
    assert.equal(runs, 4);
    assert.deepEqual(output, [`report(C@1)\n${summaryLine(1, 0)}`]);

    await sleep(10);
    assert.deepEqual(unhandled, []);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});

// A checker whose runs stay pending until released, counting how many overlap.
function gatedChecker() {
  const gate = { active: 0, maxActive: 0, runs: 0, release: [] };
  gate.runCheck = async () => {
    gate.runs += 1;
    gate.active += 1;
    gate.maxActive = Math.max(gate.maxActive, gate.active);
    await new Promise((resolve) => gate.release.push(resolve));
    gate.active -= 1;
    return outcome([diagnostic(`RUN-${gate.runs}`)]);
  };
  gate.releaseNext = async () => {
    while (gate.release.length === 0) await sleep(1);
    gate.release.shift()();
  };
  return gate;
}

test("runs never overlap: calls during a run queue exactly one more", async () => {
  const gate = gatedChecker();
  const { output, reporter } = setup({ runCheck: gate.runCheck });

  const first = reporter.run();
  const second = reporter.run();
  const third = reporter.run();
  assert.equal(second, first, "a call during a run joins it");
  assert.equal(third, first);

  await gate.releaseNext();
  await gate.releaseNext();
  await first;

  assert.equal(gate.runs, 2);
  assert.equal(gate.maxActive, 1);
  assert.deepEqual(output, [
    `report(RUN-1@1)\n${summaryLine(1, 0)}\n`,
    `report(RUN-2@1)\n${summaryLine(1, 0)}\n`,
  ]);

  // Idle again: the next call starts a new run.
  const next = reporter.run();
  assert.notEqual(next, first);
  await gate.releaseNext();
  await next;
  assert.equal(gate.runs, 3);
});

test("watch checks again after a burst of changes, once", async () => {
  const { state, output, reporter } = setup();
  const watcher = new EventEmitter();
  reporter.watch(watcher);
  await reporter.run();
  assert.equal(state.runs, 1);

  state.diagnostics = [diagnostic("A")];
  watcher.emit("all", "change", componentFile);
  watcher.emit("all", "add", join(CWD, "src", "components", "new", "new.view.yaml"));
  watcher.emit("all", "unlink", componentFile);
  assert.equal(state.runs, 1, "nothing runs before the debounce delay");

  await sleep(DEBOUNCE_MS * 5);
  assert.equal(state.runs, 2);
  assert.deepEqual(output, [`report(A@1)\n${summaryLine(1, 0)}\n`]);

  // A change that leaves the diagnostics alone runs the check but prints nothing.
  watcher.emit("all", "change", componentFile);
  await sleep(DEBOUNCE_MS * 5);
  assert.equal(state.runs, 3);
  assert.equal(output.length, 1);
});

test("watch ignores files outside the component directories", async () => {
  const { state, reporter } = setup({ dirs: ["src/components", "src/pages"] });
  const watcher = new EventEmitter();
  reporter.watch(watcher);

  watcher.emit("all", "change", join(CWD, "dist", "main.js"));
  watcher.emit("all", "change", join(CWD, "src", "setup.js"));
  watcher.emit("all", "change", join(CWD, "src", "components-old", "a.view.yaml"));
  watcher.emit("all", "change", join(CWD, "..", "other", "src", "components", "a.view.yaml"));
  await sleep(DEBOUNCE_MS * 5);
  assert.equal(state.runs, 0);

  // The second directory, a relative path and the directory itself all count.
  watcher.emit("all", "change", join(CWD, "src", "pages", "home", "home.view.yaml"));
  await sleep(DEBOUNCE_MS * 5);
  assert.equal(state.runs, 1);
  watcher.emit("all", "change", join("src", "components", "card", "card.view.yaml"));
  await sleep(DEBOUNCE_MS * 5);
  assert.equal(state.runs, 2);
  watcher.emit("all", "addDir", join(CWD, "src", "components"));
  await sleep(DEBOUNCE_MS * 5);
  assert.equal(state.runs, 3);
});

test("watch does not start a second check while one is running", async () => {
  const gate = gatedChecker();
  const { reporter } = setup({ runCheck: gate.runCheck });
  const watcher = new EventEmitter();
  reporter.watch(watcher);

  const initial = reporter.run();
  // Several debounced triggers arrive while the first run is still pending.
  for (let index = 0; index < 3; index += 1) {
    watcher.emit("all", "change", componentFile);
    await sleep(DEBOUNCE_MS * 3);
  }
  assert.equal(gate.runs, 1);
  assert.equal(gate.maxActive, 1);

  await gate.releaseNext();
  await gate.releaseNext();
  await initial;
  assert.equal(gate.runs, 2, "the triggers during the run collapse into one more run");
  assert.equal(gate.maxActive, 1);
});
