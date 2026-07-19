import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryDirectory = mkdtempSync(
  join(tmpdir(), "rettangoli-fe-package-smoke-"),
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

function collectExportTargets(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectExportTargets);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectExportTargets);
  }
  return [];
}

try {
  const tarballPath = packPackage(packageDirectory);
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
      tarballPath,
    ],
    { cwd: temporaryDirectory },
  );

  const installedPackageDirectory = join(
    temporaryDirectory,
    "node_modules",
    "@rettangoli",
    "fe",
  );
  const installedPackageJson = JSON.parse(
    readFileSync(join(installedPackageDirectory, "package.json"), "utf8"),
  );
  assert.ok(
    existsSync(join(installedPackageDirectory, "LICENSE")),
    "the published package must include its license",
  );

  for (const entry of new Set([
    installedPackageJson.main,
    ...collectExportTargets(installedPackageJson.exports),
  ])) {
    assert.equal(typeof entry, "string", "public entries must be file paths");
    assert.ok(
      existsSync(join(installedPackageDirectory, entry)),
      `published entrypoint is missing: ${entry}`,
    );
  }

  const smokeModulePath = join(temporaryDirectory, "smoke.mjs");
  writeFileSync(
    smokeModulePath,
    `
      import assert from "node:assert/strict";
      import { createRequire } from "node:module";

      globalThis.window = {};

      const fe = await import("@rettangoli/fe");
      const contracts = await import("@rettangoli/fe/contracts");
      const cli = await import("@rettangoli/fe/cli");
      const require = createRequire(import.meta.url);

      assert.equal(typeof fe.createComponent, "function");
      assert.equal(typeof fe.createI18nRuntime, "function");
      assert.equal(typeof contracts.validateSchemaContract, "function");
      assert.equal(typeof cli.build, "function");
      assert.equal(typeof cli.watch, "function");
      assert.match(require.resolve("@rettangoli/fe"), /src\\/index\\.js$/);
      assert.match(require.resolve("@rettangoli/fe/contracts"), /contracts\\/index\\.js$/);
      assert.match(require.resolve("@rettangoli/fe/cli"), /cli\\/index\\.js$/);
    `,
  );
  run(process.execPath, [smokeModulePath], { cwd: temporaryDirectory });

  console.log(
    `Packed, installed, and imported ${installedPackageJson.name}@${installedPackageJson.version} successfully.`,
  );
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
