// Paths other projects rely on: the `rtgl` bin (consumers spawn
// node_modules/rtgl/cli.js directly) and the deep imports rtgl/src/config.js
// and rtgl/src/options.js. Moving code around inside rtgl must keep them.
import assert from "node:assert/strict";
import { accessSync, constants, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8"));

test("the rtgl bin is cli.js, a node script that can be executed", () => {
  assert.equal(packageJson.bin.rtgl, "cli.js");
  assert.ok(packageJson.files.includes("cli.js"));

  const cliPath = join(packageDirectory, "cli.js");
  assert.ok(readFileSync(cliPath, "utf8").startsWith("#!/usr/bin/env node\n"));
  if (process.platform !== "win32") {
    accessSync(cliPath, constants.X_OK);
  }
});

for (const [path, names] of [
  ["rtgl/src/config.js", ["readConfig", "requireConfig"]],
  [
    "rtgl/src/options.js",
    [
      "collectValues",
      "parseIntegerOption",
      "parseIsolationOption",
      "parseNumberOption",
      "parsePortOption",
    ],
  ],
]) {
  test(`${path} can be imported and exports ${names.join(", ")}`, async () => {
    assert.ok(packageJson.files.includes("src"));

    // Resolved by package name, so an exports map that hid the path would fail.
    const url = import.meta.resolve(path);
    assert.equal(
      realpathSync(fileURLToPath(url)),
      realpathSync(join(packageDirectory, path.replace(/^rtgl\//, ""))),
    );

    const module = await import(url);
    for (const name of names) {
      assert.equal(typeof module[name], "function", `${path} must export ${name}`);
    }
  });
}
