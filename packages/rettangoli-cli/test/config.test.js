import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { readConfig } from "../src/config.js";

const temporaryDirectories = [];

function createTemporaryProject() {
  const directory = mkdtempSync(join(tmpdir(), "rettangoli-cli-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("returns null when the project has no config", () => {
  assert.equal(readConfig(createTemporaryProject()), null);
});

test("loads the project config", () => {
  const projectDirectory = createTemporaryProject();
  writeFileSync(
    join(projectDirectory, "rettangoli.config.yaml"),
    "fe:\n  dirs:\n    - ./components\n  publicDir: ./public\n",
  );

  assert.deepEqual(readConfig(projectDirectory), {
    fe: {
      dirs: ["./components"],
      publicDir: "./public",
    },
  });
});

test("reports malformed YAML with the resolved config path", () => {
  const projectDirectory = createTemporaryProject();
  const configPath = join(projectDirectory, "rettangoli.config.yaml");
  writeFileSync(configPath, "fe: [\n");

  assert.throws(
    () => readConfig(projectDirectory),
    (error) => {
      assert.match(error.message, /Error reading config file/);
      assert.match(error.message, new RegExp(configPath));
      assert.ok(error.cause);
      return true;
    },
  );
});
