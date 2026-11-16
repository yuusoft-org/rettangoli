#!/usr/bin/env node

// createChecker (exported from @rettangoli/check/cli) is what `rtgl fe build` and `rtgl fe watch`
// use to show check results: its report must equal the text `rtgl-check` prints for the same
// project, it must print nothing and leave process.exitCode alone, and `maxDiagnostics` must only
// cut the list of diagnostics, never the counts.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { check, createChecker } from "../src/cli/index.js";
import { formatTextReport } from "../src/reporters/text.js";

const binPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/cli/bin.js");
const sandboxRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "rtgl-create-checker-")));
const write = (relativePath, contents) => {
  const filePath = path.join(sandboxRoot, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, "utf8");
};
// Two diagnostics per component: an unsupported attribute and an unknown element.
const writeBrokenComponent = (dir, name) => {
  write(`${dir}/${name}/${name}.schema.yaml`, `componentName: rtgl-checker-${name}\n`);
  write(`${dir}/${name}/${name}.view.yaml`, "template:\n  - rtgl-button banana=ripe: Bad\n  - rtgl-unknown-x: missing\nstyles: {}\n");
};
const writeCleanComponent = (dir, name) => {
  write(`${dir}/${name}/${name}.schema.yaml`, `componentName: rtgl-checker-${name}\n`);
  write(`${dir}/${name}/${name}.view.yaml`, "template:\n  - rtgl-text: Hello\nstyles: {}\n");
};
const runBin = (args) => spawnSync(process.execPath, [binPath, ...args], { cwd: sandboxRoot, encoding: "utf8" });
const isDiagnosticLine = (line) => /^RTGL-[A-Z0-9-]+ \[(error|warn)\] /.test(line);

const consoleCalls = [];
const originalConsole = { log: console.log, error: console.error };
const originalExitCode = process.exitCode;

try {
  writeBrokenComponent("src/components", "alpha");
  writeBrokenComponent("src/components", "beta");
  writeBrokenComponent("src/components", "gamma");
  writeCleanComponent("src/other", "clean");
  write("rettangoli.config.yaml", "fe:\n  dirs:\n    - src/components\n");

  console.log = (...args) => consoleCalls.push(args);
  console.error = (...args) => consoleCalls.push(args);

  // The report equals the standalone text output, with explicit dirs and with the config's dirs.
  const standalone = runBin(["--dir", "src/components"]);
  assert.equal(standalone.status, 1);
  assert.equal(standalone.stdout, "");
  for (const dirs of [["src/components"], []]) {
    const { result, report } = await createChecker({ cwd: sandboxRoot, dirs })();
    assert.equal(result.summary.bySeverity.error, 6);
    assert.equal(`${report}\n`, standalone.stderr);
  }

  // Nothing printed, and the exit code is left alone even though there are errors.
  assert.deepEqual(consoleCalls, []);
  assert.equal(process.exitCode, originalExitCode);

  // maxDiagnostics cuts the list at a diagnostic boundary and counts the rest.
  const full = standalone.stderr.trimEnd().split("\n");
  const { result: cappedResult, report: cappedReport } = await createChecker({
    cwd: sandboxRoot,
    dirs: ["src/components"],
    maxDiagnostics: 4,
  })();
  const capped = cappedReport.split("\n");
  assert.equal(cappedResult.diagnostics.length, 6, "the result keeps every diagnostic");
  assert.equal(full.filter(isDiagnosticLine).length, 6);
  assert.equal(capped.filter(isDiagnosticLine).length, 4);
  assert.equal(capped.at(-1), "[Check] 2 more diagnostic(s) not shown.");
  assert.deepEqual(capped.slice(0, -1), full.slice(0, capped.length - 1));
  assert.ok(isDiagnosticLine(full[capped.length - 1]));
  assert.ok(capped.includes("[Check] Errors: 6, Warnings: 0."));

  // A limit that is not reached, or not a count, changes nothing.
  const { result } = await createChecker({ cwd: sandboxRoot, dirs: ["src/components"] })();
  for (const maxDiagnostics of [6, 7, undefined, null, -1, 2.5, "4"]) {
    assert.equal(formatTextReport({ result, maxDiagnostics }), full.join("\n"), `maxDiagnostics=${maxDiagnostics}`);
  }
  const none = formatTextReport({ result, maxDiagnostics: 0 }).split("\n");
  assert.equal(none.filter(isDiagnosticLine).length, 0);
  assert.equal(none.at(-1), "[Check] 6 more diagnostic(s) not shown.");

  // A clean project: the same clean report as the standalone run.
  const cleanStandalone = runBin(["--dir", "src/other"]);
  assert.equal(cleanStandalone.status, 0);
  const clean = await createChecker({ cwd: sandboxRoot, dirs: ["src/other"], maxDiagnostics: 4 })();
  assert.equal(clean.result.summary.total, 0);
  assert.equal(`${clean.report}\n`, cleanStandalone.stdout);
  assert.ok(clean.report.endsWith("[Check] No issues found."));

  // One checker sees later changes to the files (the incremental cache is not stale).
  const runCheck = createChecker({ cwd: sandboxRoot, dirs: ["src/components"] });
  assert.equal((await runCheck()).result.summary.total, 6);
  writeCleanComponent("src/components", "alpha");
  assert.equal((await runCheck()).result.summary.total, 4);
  writeBrokenComponent("src/components", "delta");
  assert.equal((await runCheck()).result.summary.total, 6);
  rmSync(path.join(sandboxRoot, "src/components/delta"), { recursive: true });
  const afterRemoval = await runCheck();
  assert.equal(afterRemoval.result.summary.total, 4);
  assert.equal(`${afterRemoval.report}\n`, runBin(["--dir", "src/components"]).stderr);

  // The options that select what is analyzed are passed on, like in check().
  const withoutYahtml = await createChecker({ cwd: sandboxRoot, dirs: ["src/components"], includeYahtml: false })();
  assert.equal(`${withoutYahtml.report}\n`, runBin(["--dir", "src/components", "--no-yahtml"]).stdout);

  // Problems that stop check() are thrown when the checker is created.
  assert.throws(
    () => createChecker({ cwd: sandboxRoot, dirs: ["src/missing"] }),
    /Component directories do not exist: src\/missing/,
  );
  await assert.rejects(
    check({ cwd: sandboxRoot, dirs: ["src/missing"] }),
    /Component directories do not exist: src\/missing/,
  );
  write("rettangoli.config.yaml", "fe: [\n");
  assert.throws(
    () => createChecker({ cwd: sandboxRoot, dirs: ["src/components"] }),
    /Failed to read rettangoli\.config\.yaml/,
  );
  assert.deepEqual(consoleCalls, []);

  console.log = originalConsole.log;
  console.log("createChecker contract pass");
} finally {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  process.exitCode = originalExitCode;
  rmSync(sandboxRoot, { recursive: true, force: true });
}
