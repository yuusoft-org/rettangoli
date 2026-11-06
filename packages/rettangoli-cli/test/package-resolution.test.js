// Which @rettangoli/fe the project resolves versus the one rtgl runs, and the
// fe build / fe watch warning when they differ. Layouts are built in a temp
// directory the way npm installs them.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import {
  describeFeSkew,
  findBundledPackage,
  findProjectPackage,
} from "../src/package-resolution.js";

const FE = "@rettangoli/fe";
const root = realpathSync(mkdtempSync(join(tmpdir(), "rtgl-resolution-")));
after(() => rmSync(root, { recursive: true, force: true }));

let layoutCount = 0;

// Creates <root>/<n>/app with the given installed packages, each
// { path: "node_modules/...", version, exports? }. Returns the app directory.
function createApp(packages) {
  const app = join(root, String(layoutCount++), "app");
  mkdirSync(app, { recursive: true });
  writeFileSync(join(app, "package.json"), '{ "name": "app" }\n');
  for (const { path, version, exports } of packages) {
    const dir = join(app, path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: FE, version, type: "module", exports }),
    );
  }
  return app;
}

// rtgl's copy is the one found from rtgl's own directory.
const rtglOf = (app) => join(app, "node_modules", "rtgl");

function skewWarning(app, command) {
  return describeFeSkew({
    command,
    project: findProjectPackage(app, FE),
    bundled: findProjectPackage(rtglOf(app), FE),
    rtglVersion: "2.3.1",
  });
}

test("one hoisted copy: both sides find it and nothing is printed", () => {
  const app = createApp([{ path: "node_modules/@rettangoli/fe", version: "1.6.1" }]);
  mkdirSync(rtglOf(app), { recursive: true });

  assert.deepEqual(findProjectPackage(app, FE), { version: "1.6.1" });
  assert.deepEqual(findProjectPackage(rtglOf(app), FE), { version: "1.6.1" });
  assert.equal(skewWarning(app, "build"), null);
  assert.equal(skewWarning(app, "watch"), null);
});

test("project fe 1.6.0 and rtgl's nested 1.6.1: fe build and fe watch warn", () => {
  const app = createApp([
    { path: "node_modules/@rettangoli/fe", version: "1.6.0" },
    { path: "node_modules/rtgl/node_modules/@rettangoli/fe", version: "1.6.1" },
  ]);

  assert.equal(findProjectPackage(app, FE).version, "1.6.0");
  assert.equal(findProjectPackage(rtglOf(app), FE).version, "1.6.1");
  const expected =
    "rtgl: warning: this project resolves @rettangoli/fe@1.6.0 but rtgl 2.3.1 runs " +
    "@rettangoli/fe@1.6.1; fe build bundles the project's runtime while fe watch " +
    "serves rtgl's. Align @rettangoli/fe and rtgl (upgrade rtgl, or pin " +
    "@rettangoli/fe@1.6.1).";
  assert.equal(skewWarning(app, "build"), expected);
  assert.equal(skewWarning(app, "watch"), expected);
});

test("same version in two places: nothing is printed", () => {
  const app = createApp([
    { path: "node_modules/@rettangoli/fe", version: "1.6.1" },
    { path: "node_modules/rtgl/node_modules/@rettangoli/fe", version: "1.6.1" },
  ]);

  assert.equal(skewWarning(app, "build"), null);
});

test("no project fe: fe build warns, fe watch (which serves rtgl's copy) does not", () => {
  const app = createApp([
    { path: "node_modules/rtgl/node_modules/@rettangoli/fe", version: "1.6.1" },
  ]);

  assert.equal(findProjectPackage(app, FE), null);
  assert.equal(
    skewWarning(app, "build"),
    "rtgl: warning: this project does not install @rettangoli/fe; fe build bundles " +
      "the runtime from the project and cannot resolve it. Run npm i -D @rettangoli/fe@1.6.1",
  );
  assert.equal(skewWarning(app, "watch"), null);
});

test("a package whose exports map hides package.json is still found", () => {
  const app = createApp([
    {
      path: "node_modules/@rettangoli/fe",
      version: "1.6.0",
      exports: { ".": "./src/index.js", "./cli": "./src/cli/index.js" },
    },
  ]);

  assert.equal(findProjectPackage(app, FE).version, "1.6.0");
});

test("a symlinked workspace package is found", () => {
  const app = createApp([{ path: "packages/fe", version: "1.6.1" }]);
  mkdirSync(join(app, "node_modules", "@rettangoli"), { recursive: true });
  symlinkSync(join(app, "packages", "fe"), join(app, "node_modules", FE), "dir");

  assert.deepEqual(findProjectPackage(app, FE), { version: "1.6.1" });
});

test("the nearest copy wins, from a subdirectory of the project", () => {
  const app = createApp([{ path: "node_modules/@rettangoli/fe", version: "1.6.0" }]);
  const sub = join(app, "packages", "web");
  mkdirSync(join(sub, "node_modules", FE), { recursive: true });
  writeFileSync(join(sub, "node_modules", FE, "package.json"), '{ "version": "1.5.0" }');

  assert.equal(findProjectPackage(sub, FE).version, "1.5.0");
  assert.equal(findProjectPackage(dirname(sub), FE).version, "1.6.0");
});

test("unknown versions and a missing rtgl copy never warn", () => {
  const a = { version: "1.6.0" };
  const b = { version: "1.6.1" };
  assert.equal(describeFeSkew({ command: "build", project: a, bundled: null }), null);
  assert.equal(describeFeSkew({ command: "build", project: null, bundled: null }), null);
  assert.equal(describeFeSkew({ command: "build", project: {}, bundled: b }), null);
  assert.equal(describeFeSkew({ command: "build", project: a, bundled: {} }), null);
});

test("rtgl's own copy is the workspace package of this checkout", () => {
  const feDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "rettangoli-fe");
  const { version } = JSON.parse(readFileSync(join(feDirectory, "package.json"), "utf8"));
  assert.equal(findBundledPackage(FE).version, version);
});

// warnFeSkew keeps per-process state, so each case runs in a fresh process
// that calls it once per command and writes to the real stderr.
function runWarnFeSkew(cwd, commands) {
  const moduleUrl = new URL("../src/package-resolution.js", import.meta.url).href;
  const script = `
    const { warnFeSkew } = await import(${JSON.stringify(moduleUrl)});
    for (const command of ${JSON.stringify(commands)}) {
      warnFeSkew({ cwd: ${JSON.stringify(cwd)}, command, rtglVersion: "9.9.9" });
    }
  `;
  return spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8",
  });
}

test("warnFeSkew prints at most one line per process", () => {
  const bundledVersion = findBundledPackage(FE).version;
  const app = createApp([{ path: "node_modules/@rettangoli/fe", version: "0.0.1-other" }]);

  const { status, stdout, stderr } = runWarnFeSkew(app, ["build", "watch", "build"]);
  assert.equal(status, 0);
  assert.equal(stdout, "");
  assert.equal(
    stderr,
    `rtgl: warning: this project resolves @rettangoli/fe@0.0.1-other but rtgl 9.9.9 runs ` +
      `@rettangoli/fe@${bundledVersion}; fe build bundles the project's runtime while fe ` +
      `watch serves rtgl's. Align @rettangoli/fe and rtgl (upgrade rtgl, or pin ` +
      `@rettangoli/fe@${bundledVersion}).\n`,
  );
});

test("warnFeSkew stays silent instead of failing on a broken package.json", () => {
  const app = createApp([]);
  mkdirSync(join(app, "node_modules", FE), { recursive: true });
  writeFileSync(join(app, "node_modules", FE, "package.json"), "{ not json");

  assert.deepEqual(
    (({ status, stdout, stderr }) => ({ status, stdout, stderr }))(runWarnFeSkew(app, ["build"])),
    { status: 0, stdout: "", stderr: "" },
  );
});
