// Runs every spec/**/*.browser.mjs with node, one after another, from the
// package root (the specs read paths like vt/static/public/main.js).
//
//   node scripts/run-browser-specs.mjs [--only <substring>]
//
// Run `bun run build:dev` first, or use `bun run test:browser`, which does.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const args = process.argv.slice(2);
const onlyIndex = args.indexOf("--only");
const only = onlyIndex === -1 ? "" : (args[onlyIndex + 1] ?? "");
if (onlyIndex !== -1 && !only) {
  console.error("--only needs a substring");
  process.exit(2);
}

const specs = readdirSync(path.join(packageDir, "spec"), { recursive: true })
  .map((file) => file.split(path.sep).join("/"))
  .filter((file) => file.endsWith(".browser.mjs"))
  .filter((file) => file.includes(only))
  .sort();
if (specs.length === 0) {
  console.error(`No browser specs match "${only}"`);
  process.exit(2);
}

const results = specs.map((file) => {
  console.log(`\n--- spec/${file}`);
  const startedAt = Date.now();
  const run = spawnSync(process.execPath, [`spec/${file}`], {
    cwd: packageDir,
    stdio: "inherit",
  });
  return {
    file,
    status: run.status === 0 ? "pass" : "FAIL",
    seconds: (Date.now() - startedAt) / 1000,
  };
});

console.log("\nBrowser specs");
for (const { file, status, seconds } of results) {
  console.log(`${status.padEnd(5)} ${seconds.toFixed(1).padStart(6)}s  ${file}`);
}
const failed = results.filter(({ status }) => status === "FAIL");
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
