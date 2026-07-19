import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);
const workspaceDirectory = path.resolve(packageDirectory, "../..");
const temporaryDirectory = mkdtempSync(
  path.join(tmpdir(), "rettangoli-check-package-smoke-"),
);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const commandEnvironment = {
  ...process.env,
  npm_config_cache: path.join(temporaryDirectory, "npm-cache"),
};

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      env: commandEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
  } catch (error) {
    const output = [error.stdout, error.stderr]
      .filter(Boolean)
      .map((value) => value.toString().trim())
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `${command} ${args.join(" ")} failed${output ? `:\n${output}` : ""}`,
      { cause: error },
    );
  }
}

function packPackage(directory) {
  const output = run(
    npmCommand,
    ["pack", "--silent", "--pack-destination", temporaryDirectory],
    { cwd: directory },
  );
  const match = output.match(/(?:^|\r?\n)([^\r\n]+\.tgz)\s*$/);
  assert.ok(match, `npm pack did not report a tarball:\n${output}`);
  return path.join(temporaryDirectory, match[1]);
}

try {
  const tarballPaths = [
    "rettangoli-fe",
    "rettangoli-ui",
    "rettangoli-check",
  ].map((name) =>
    packPackage(path.join(workspaceDirectory, "packages", name)),
  );

  writeFileSync(
    path.join(temporaryDirectory, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
  );
  run(
    npmCommand,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-package-lock",
      "--omit=dev",
      ...tarballPaths,
    ],
    { cwd: temporaryDirectory },
  );

  const installedPackageDirectory = path.join(
    temporaryDirectory,
    "node_modules",
    "@rettangoli",
    "check",
  );
  const installedPackageJson = JSON.parse(
    readFileSync(
      path.join(installedPackageDirectory, "package.json"),
      "utf8",
    ),
  );
  assert.ok(
    existsSync(path.join(installedPackageDirectory, "LICENSE")),
    "the published package must include its license",
  );

  const installedUiPackageJson = JSON.parse(
    readFileSync(
      path.join(
        temporaryDirectory,
        "node_modules",
        "@rettangoli",
        "ui",
        "package.json",
      ),
      "utf8",
    ),
  );
  assert.equal(
    installedUiPackageJson.version,
    installedPackageJson.dependencies["@rettangoli/ui"],
    "@rettangoli/ui must resolve to the checker's declared release version",
  );

  const componentDirectory = path.join(
    temporaryDirectory,
    "fixture",
    "src",
    "components",
    "card",
  );
  mkdirSync(componentDirectory, { recursive: true });
  writeFileSync(
    path.join(componentDirectory, "card.schema.yaml"),
    "componentName: rtgl-package-smoke-card\npropsSchema:\n  type: object\n  properties: {}\n",
  );
  writeFileSync(
    path.join(componentDirectory, "card.view.yaml"),
    "template:\n  - rtgl-view p=md:\n      - rtgl-text: Package smoke\nstyles: {}\n",
  );

  const binPath = path.join(
    installedPackageDirectory,
    installedPackageJson.bin["rtgl-check"],
  );
  assert.ok(existsSync(binPath), "the published rtgl-check bin must exist");
  const output = run(
    process.execPath,
    [
      binPath,
      "--dir",
      path.join(temporaryDirectory, "fixture", "src", "components"),
      "--format",
      "json",
    ],
    { cwd: path.join(temporaryDirectory, "fixture") },
  );
  const result = JSON.parse(output);
  assert.equal(result.ok, true, output);
  assert.equal(result.summary.bySeverity.error, 0, output);
  assert.ok(result.registryTagCount > 0, output);

  console.log(
    `Packed, installed, and executed ${installedPackageJson.name}@${installedPackageJson.version} successfully.`,
  );
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
