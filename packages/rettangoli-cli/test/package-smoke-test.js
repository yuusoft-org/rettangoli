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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const workspaceDirectory = resolve(packageDirectory, "../..");
const temporaryDirectory = mkdtempSync(
  join(tmpdir(), "rettangoli-cli-package-smoke-"),
);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const commandEnvironment = {
  ...process.env,
  npm_config_cache: join(temporaryDirectory, "npm-cache"),
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
  return join(temporaryDirectory, match[1]);
}

try {
  const packageDirectories = [
    "rettangoli-fe",
    "rettangoli-ui",
    "rettangoli-check",
    "rettangoli-cli",
  ].map((name) => join(workspaceDirectory, "packages", name));
  const tarballPaths = packageDirectories.map(packPackage);

  writeFileSync(
    join(temporaryDirectory, "package.json"),
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

  const installedPackageDirectory = join(
    temporaryDirectory,
    "node_modules",
    "rtgl",
  );
  const installedPackageJson = JSON.parse(
    readFileSync(join(installedPackageDirectory, "package.json"), "utf8"),
  );
  const binEntry = installedPackageJson.bin?.rtgl;

  assert.ok(
    existsSync(join(installedPackageDirectory, "LICENSE")),
    "the published package must include its license",
  );
  assert.equal(typeof binEntry, "string", "the rtgl bin entry must be declared");
  assert.ok(
    existsSync(join(installedPackageDirectory, binEntry)),
    `published bin entry is missing: ${binEntry}`,
  );
  for (const internalModule of ["src/config.js", "src/options.js"]) {
    assert.ok(
      existsSync(join(installedPackageDirectory, internalModule)),
      `published CLI module is missing: ${internalModule}`,
    );
  }

  for (const dependencyName of [
    "@rettangoli/check",
    "@rettangoli/fe",
    "@rettangoli/ui",
  ]) {
    const installedDependencyJson = JSON.parse(
      readFileSync(
        join(
          temporaryDirectory,
          "node_modules",
          ...dependencyName.split("/"),
          "package.json",
        ),
        "utf8",
      ),
    );
    assert.equal(
      installedDependencyJson.version,
      installedPackageJson.dependencies[dependencyName],
      `${dependencyName} must resolve to the CLI's declared release version`,
    );
  }

  const installedBinPath = join(installedPackageDirectory, binEntry);
  const versionOutput = run(process.execPath, [installedBinPath, "--version"]);
  assert.equal(versionOutput.trim(), installedPackageJson.version);

  const helpOutput = run(process.execPath, [installedBinPath, "--help"]);
  for (const command of ["check", "fe", "be", "vt", "sites", "ui"]) {
    assert.match(helpOutput, new RegExp(`\\b${command}\\b`));
    assert.match(
      run(process.execPath, [installedBinPath, command, "--help"]),
      /Usage:/,
      `${command} should load its packaged dependency and print help`,
    );
  }

  const componentDirectory = join(
    temporaryDirectory,
    "fixture",
    "src",
    "components",
    "card",
  );
  mkdirSync(componentDirectory, { recursive: true });
  writeFileSync(
    join(componentDirectory, "card.schema.yaml"),
    "componentName: rtgl-package-smoke-card\npropsSchema:\n  type: object\n  properties: {}\n",
  );
  writeFileSync(
    join(componentDirectory, "card.view.yaml"),
    "template:\n  - rtgl-view p=md:\n      - rtgl-text: Package smoke\nstyles: {}\n",
  );
  const checkOutput = run(
    process.execPath,
    [
      installedBinPath,
      "check",
      "--dir",
      join(temporaryDirectory, "fixture", "src", "components"),
      "--format",
      "json",
    ],
    { cwd: join(temporaryDirectory, "fixture") },
  );
  const checkResult = JSON.parse(checkOutput);
  assert.equal(checkResult.ok, true, checkOutput);
  assert.equal(checkResult.summary.bySeverity.error, 0, checkOutput);
  assert.ok(checkResult.registryTagCount > 0, checkOutput);

  console.log(
    `Packed, installed, and executed ${installedPackageJson.name}@${installedPackageJson.version} successfully.`,
  );
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
