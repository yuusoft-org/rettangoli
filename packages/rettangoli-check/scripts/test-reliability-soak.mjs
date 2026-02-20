#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const getArg = (flag, fallback = "") => {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
};

const loops = Number.parseInt(getArg("--loops", process.env.RTGL_SOAK_LOOPS || "5"), 10);
const packageRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const reportPath = path.resolve(packageRoot, "test", "reliability-soak-report.json");

const runs = [];
let failed = false;

for (let index = 0; index < loops; index += 1) {
  const startedAt = Date.now();
  const result = spawnSync("node ./scripts/test-reliability-gates.mjs", {
    cwd: packageRoot,
    encoding: "utf8",
    shell: true,
  });

  const run = {
    run: index + 1,
    durationMs: Date.now() - startedAt,
    passed: result.status === 0,
    exitCode: Number.isInteger(result.status) ? result.status : 1,
  };
  runs.push(run);

  const status = run.passed ? "PASS" : "FAIL";
  console.log(`[${status}] soak run ${run.run}/${loops} (${run.durationMs}ms)`);

  if (!run.passed) {
    failed = true;
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    break;
  }
}

writeFileSync(reportPath, `${JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  loops,
  failed,
  runs,
}, null, 2)}\n`, "utf8");
console.log(`Reliability soak report written: ${path.relative(packageRoot, reportPath)}`);

if (failed) {
  process.exit(1);
}
