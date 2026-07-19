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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const workspaceDir = resolve(packageDir, "../..");
const temporaryDir = mkdtempSync(join(tmpdir(), "rettangoli-ui-package-smoke-"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmCacheDir = join(temporaryDir, "npm-cache");
const commandEnvironment = {
  ...process.env,
  npm_config_cache: npmCacheDir,
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

function collectExportTargets(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectExportTargets);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectExportTargets);
  }

  return [];
}

function packPackage(directory) {
  const output = run(
    npmCommand,
    ["pack", "--silent", "--pack-destination", temporaryDir],
    { cwd: directory },
  );
  const match = output.match(/(?:^|\r?\n)([^\r\n]+\.tgz)\s*$/);
  assert.ok(match, `npm pack did not report a tarball:\n${output}`);
  const tarballPath = join(temporaryDir, match[1]);
  assert.ok(existsSync(tarballPath), `packed tarball is missing: ${tarballPath}`);
  return tarballPath;
}

try {
  const feTarballPath = packPackage(
    join(workspaceDir, "packages", "rettangoli-fe"),
  );
  const uiTarballPath = packPackage(packageDir);

  writeFileSync(
    join(temporaryDir, "package.json"),
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
      "--fetch-retries=0",
      "--fetch-timeout=15000",
      feTarballPath,
      uiTarballPath,
    ],
    { cwd: temporaryDir },
  );

  const installedPackageDir = join(
    temporaryDir,
    "node_modules",
    "@rettangoli",
    "ui",
  );
  const installedPackageJson = JSON.parse(
    readFileSync(join(installedPackageDir, "package.json"), "utf8"),
  );

  assert.ok(
    existsSync(join(installedPackageDir, "LICENSE")),
    "the published package must include its license",
  );
  const expectedModuleEntry = "./dist/rettangoli-esm.min.js";
  assert.equal(installedPackageJson.main, expectedModuleEntry);
  assert.equal(installedPackageJson.module, expectedModuleEntry);
  assert.equal(installedPackageJson.exports["."], expectedModuleEntry);

  const installedFePackageJson = JSON.parse(
    readFileSync(
      join(temporaryDir, "node_modules", "@rettangoli", "fe", "package.json"),
      "utf8",
    ),
  );
  assert.equal(
    installedFePackageJson.version,
    installedPackageJson.dependencies["@rettangoli/fe"],
    "@rettangoli/fe must resolve to the UI package's declared release version",
  );

  const publishedEntrypoints = new Set([
    installedPackageJson.main,
    installedPackageJson.module,
    ...collectExportTargets(installedPackageJson.exports),
  ]);

  for (const entry of publishedEntrypoints) {
    assert.ok(entry.startsWith("./"), `entrypoint must be package-relative: ${entry}`);
    assert.ok(!entry.includes("*"), `smoke test cannot verify wildcard entrypoint: ${entry}`);
    assert.ok(
      existsSync(join(installedPackageDir, entry)),
      `published entrypoint is missing: ${entry}`,
    );
  }

  for (const artifact of [
    "dist/rettangoli-esm.min.js",
    "dist/rettangoli-iife-ui.min.js",
    "dist/rettangoli-iife-layout.min.js",
  ]) {
    assert.ok(
      existsSync(join(installedPackageDir, artifact)),
      `published build artifact is missing: ${artifact}`,
    );
  }

  const smokeModulePath = join(temporaryDir, "smoke.mjs");
  writeFileSync(
    smokeModulePath,
    `
      import assert from "node:assert/strict";
      import { createRequire } from "node:module";

      globalThis.HTMLElement = class {};

      const ui = await import("@rettangoli/ui");
      const cli = await import("@rettangoli/ui/cli");
      const require = createRequire(import.meta.url);

      assert.equal(typeof ui.RettangoliButton, "function");
      assert.equal(typeof ui.RettangoliView, "function");
      assert.equal(typeof ui.createGlobalUI, "function");
      assert.equal(typeof cli.buildSvg, "function");
      assert.match(
        require.resolve("@rettangoli/ui"),
        /rettangoli-esm\\.min\\.js$/,
      );
      assert.match(
        require.resolve("@rettangoli/ui/themes/base.css"),
        /base\\.css$/,
      );
    `,
  );

  run(process.execPath, [smokeModulePath], { cwd: temporaryDir });

  console.log(
    `Packed and imported ${installedPackageJson.name}@${installedPackageJson.version} successfully.`,
  );
} finally {
  rmSync(temporaryDir, { force: true, recursive: true });
}
