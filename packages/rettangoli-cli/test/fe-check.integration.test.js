// `rtgl fe build` and `rtgl fe watch` with the real @rettangoli/fe and
// @rettangoli/check of this workspace: the [Check] lines equal what
// `rtgl check` prints for the same project, and the build itself (exit code,
// output files) is the same with and without them.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MAX_LISTED_DIAGNOSTICS } from "../src/fe-check.js";

const packageDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(packageDirectory, "cli.js");
const fePackageDirectory = join(packageDirectory, "..", "rettangoli-fe");
const feCliUrl = pathToFileURL(join(fePackageDirectory, "src", "cli", "index.js")).href;

const projects = [];
after(() => {
  projects.forEach((directory) => rmSync(directory, { recursive: true, force: true }));
});

const CONFIG = "fe:\n  dirs:\n    - src/components\n  setup: src/setup.js\n  outfile: dist/main.js\n";

// 4 diagnostics that fe build accepts: an unknown listener option, a missing
// handler and two undeclared attributes.
const BROKEN_VIEW = [
  "refs:",
  "  ctaButton:",
  "    eventListeners:",
  "      click:",
  "        handler: handleTap",
  "        bogusOption: true",
  "template:",
  "  - rtgl-button#ctaButton banana=ripe: Click",
  "  - rtgl-text nope=1: text",
  "styles: {}",
  "",
].join("\n");
const CLEAN_VIEW = "template:\n  - rtgl-text: hi\nstyles: {}\n";

const component = (name, view) => ({
  [`src/components/${name}/${name}.schema.yaml`]: `componentName: fx-${name}\n`,
  [`src/components/${name}/${name}.view.yaml`]: view,
  [`src/components/${name}/${name}.handlers.js`]: "export const handleOther = () => {};\n",
  [`src/components/${name}/${name}.store.js`]: "export const createInitialState = () => ({});\n",
});

const BROKEN_PROJECT = { ...component("card", BROKEN_VIEW), ...component("clean", CLEAN_VIEW) };
const CLEAN_PROJECT = { ...component("card", CLEAN_VIEW), ...component("clean", CLEAN_VIEW) };

function write(directory, file, content) {
  const path = join(directory, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

// A project that installs this workspace's @rettangoli/fe, as fe build needs.
function createProject(files) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "rtgl-fe-check-")));
  projects.push(directory);
  const allFiles = {
    "package.json": '{ "name": "fixture", "type": "module" }\n',
    "rettangoli.config.yaml": CONFIG,
    "src/setup.js": "const deps = { components: {} };\nexport { deps };\n",
    ...files,
  };
  for (const [file, content] of Object.entries(allFiles)) {
    write(directory, file, content);
  }
  mkdirSync(join(directory, "node_modules", "@rettangoli"), { recursive: true });
  symlinkSync(fePackageDirectory, join(directory, "node_modules", "@rettangoli", "fe"), "dir");
  return directory;
}

function runNode(args, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: { PATH: process.env.PATH, NO_COLOR: "1", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60000,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (exitCode) => resolvePromise({ exitCode, stdout, stderr }));
  });
}

const rtgl = (cwd, ...args) => runNode([cliPath, ...args], cwd);

// @rettangoli/fe's build alone, without rtgl and so without the check.
const buildWithoutCheck = (cwd) =>
  runNode(
    [
      "--input-type=module",
      "-e",
      `const { build } = await import(${JSON.stringify(feCliUrl)});
       await build({ dirs: ["src/components"], setup: "src/setup.js", outfile: "dist/main.js", i18n: null });`,
    ],
    cwd,
  );

// Every file below <project>/dist with its content.
function readOutput(directory) {
  const output = {};
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) visit(path);
      else output[relative(directory, path)] = readFileSync(path, "utf8");
    }
  };
  visit(join(directory, "dist"));
  return output;
}

const BUILD_LINES = /^\[Build\] Building .*\n\[Build\] Complete in \d+ms\.\n/;

const summaryLine = (errors, warnings) =>
  `[Check] ${errors} error(s), ${warnings} warning(s). These do not fail the build. ` +
  "Run `rtgl check` for the full report and to fail CI on them.\n";

test("fe build prints the rtgl check report of the same project and still succeeds", async () => {
  const project = createProject(BROKEN_PROJECT);

  const build = await rtgl(project, "fe", "build");
  const standalone = await rtgl(project, "check");
  const standaloneWithDir = await rtgl(project, "check", "--dir", "src/components");

  // rtgl check fails on these diagnostics; the build does not.
  assert.equal(standalone.exitCode, 1);
  assert.equal(standalone.stdout, "");
  assert.match(standalone.stderr, /^\[Check\] Errors: 4, Warnings: 0\.$/m);
  assert.deepEqual(standaloneWithDir, standalone);

  assert.equal(build.exitCode, 0);
  assert.equal(build.stderr, "");
  assert.match(build.stdout, BUILD_LINES);
  assert.equal(
    build.stdout.replace(BUILD_LINES, ""),
    standalone.stderr + summaryLine(4, 0),
    "everything after the build lines is the rtgl check report plus one summary line",
  );
  for (const code of ["RTGL-CHECK-LISTENER-008", "RTGL-CHECK-SYMBOL-001", "RTGL-CHECK-YAHTML-003"]) {
    assert.ok(build.stdout.includes(`${code} [error]`), `${code} is listed`);
  }
  assert.ok(!/\x1b\[/.test(build.stdout), "no color codes");
});

test("the build output is the same with and without the check", async () => {
  const withCheck = createProject(BROKEN_PROJECT);
  const withoutCheck = createProject(BROKEN_PROJECT);

  const checked = await rtgl(withCheck, "fe", "build");
  const plain = await buildWithoutCheck(withoutCheck);

  assert.equal(checked.exitCode, 0);
  assert.equal(plain.exitCode, 0, plain.stderr);
  assert.ok(checked.stdout.includes("[Check] Errors: 4"));
  assert.ok(!plain.stdout.includes("[Check]"));

  const output = readOutput(withCheck);
  assert.deepEqual(Object.keys(output), ["dist/main.js"]);
  assert.deepEqual(output, readOutput(withoutCheck));
  // The check writes nothing into the project.
  assert.deepEqual(readdirSync(withCheck).sort(), readdirSync(withoutCheck).sort());
});

test("a project without diagnostics builds with exactly the output it had before", async () => {
  const project = createProject(CLEAN_PROJECT);

  const build = await rtgl(project, "fe", "build");
  const standalone = await rtgl(project, "check");

  assert.equal(standalone.exitCode, 0);
  assert.match(standalone.stdout, /\[Check\] No issues found\./);
  assert.equal(build.exitCode, 0);
  assert.equal(build.stderr, "");
  assert.equal(build.stdout.replace(BUILD_LINES, ""), "", "only the two [Build] lines");
});

test("fe build lists at most 10 diagnostics and counts the rest", async () => {
  const files = {};
  for (let index = 1; index <= 6; index += 1) {
    Object.assign(files, component(`c${index}`, BROKEN_VIEW));
  }
  const project = createProject(files);

  const build = await rtgl(project, "fe", "build");
  const standalone = await rtgl(project, "check");

  assert.equal(build.exitCode, 0);
  const report = build.stdout.replace(BUILD_LINES, "");
  const lines = report.split("\n");
  const standaloneLines = standalone.stderr.split("\n");
  const isDiagnostic = (line) => /^RTGL-[A-Z0-9-]+ \[(error|warn)\] /.test(line);

  assert.equal(standaloneLines.filter(isDiagnostic).length, 24);
  assert.equal(lines.filter(isDiagnostic).length, MAX_LISTED_DIAGNOSTICS);
  assert.deepEqual(lines.slice(-3), [
    "[Check] 14 more diagnostic(s) not shown.",
    summaryLine(24, 0).trimEnd(),
    "",
  ]);
  // Up to the cut, the build prints the rtgl check report line for line: the
  // header with the full counts and the first 10 diagnostics.
  const listed = lines.slice(0, -3);
  assert.deepEqual(listed, standaloneLines.slice(0, listed.length));
  assert.ok(listed.includes("[Check] Errors: 24, Warnings: 0."));
  assert.ok(isDiagnostic(standaloneLines[listed.length]), "the cut is at a diagnostic boundary");
});

test("a failing build fails as before and prints no check report", async () => {
  const files = { ...BROKEN_PROJECT };
  // fe build rejects a component without a schema file.
  delete files["src/components/card/card.schema.yaml"];
  const project = createProject(files);
  const viaRtgl = await rtgl(project, "fe", "build");
  const plain = await buildWithoutCheck(project);

  assert.equal(viaRtgl.exitCode, 1);
  assert.notEqual(plain.exitCode, 0);
  assert.ok(!viaRtgl.stdout.includes("[Check]"), viaRtgl.stdout);
  assert.ok(!viaRtgl.stderr.includes("These do not fail the build"));
});

function freePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePromise(port));
    });
  });
}

test("fe watch prints the report at startup and again when the diagnostics change", async () => {
  const project = createProject(BROKEN_PROJECT);
  const viewPath = join(project, "src/components/card/card.view.yaml");
  const child = spawn(process.execPath, [cliPath, "fe", "watch", "-p", String(await freePort())], {
    cwd: project,
    env: { PATH: process.env.PATH, NO_COLOR: "1", FORCE_COLOR: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
  child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
  const closed = new Promise((resolvePromise) => child.on("close", resolvePromise));

  const count = (pattern) => stdout.split(pattern).length - 1;
  const waitFor = async (description, condition) => {
    for (let waited = 0; waited < 30000; waited += 50) {
      if (condition()) return;
      if (child.exitCode !== null) break;
      await sleep(50);
    }
    assert.fail(`${description} did not happen.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  };

  try {
    const standalone = await rtgl(project, "check");
    await waitFor("the initial report", () => stdout.includes(summaryLine(4, 0)));
    assert.ok(
      stdout.includes(standalone.stderr + summaryLine(4, 0)),
      "the initial report equals the rtgl check report",
    );
    assert.equal(count("[Check] Scanned"), 1);

    // 1. Lines move, diagnostics stay: checked again, not printed again.
    //    Then one diagnostic is fixed: printed again, once.
    writeFileSync(viewPath, `# a comment\n${BROKEN_VIEW}`);
    await sleep(1500);
    assert.equal(count("[Check] Scanned"), 1, "moved diagnostics are not printed again");

    writeFileSync(viewPath, `# a comment\n${BROKEN_VIEW.replace(" banana=ripe", "")}`);
    await waitFor("the report after a fix", () => stdout.includes(summaryLine(3, 0)));
    assert.equal(count("[Check] Scanned"), 2);

    // 2. Everything fixed: the clean report, without the summary line.
    writeFileSync(viewPath, CLEAN_VIEW);
    await waitFor("the clean report", () => stdout.includes("[Check] No issues found."));
    assert.equal(count("[Check] Scanned"), 3);
    assert.equal(count("These do not fail the build"), 2);

    // 3. A new component with a mistake.
    for (const [file, content] of Object.entries(component("added", BROKEN_VIEW))) {
      write(project, file, content);
    }
    await waitFor("the report for the added component", () => count(summaryLine(4, 0)) === 2);
    assert.ok(stdout.includes("components/added: unsupported attr/prop 'banana'"));

    assert.equal(child.exitCode, null, "the watcher is still running");
    assert.ok(!stderr.includes("[Check]"), stderr);
  } finally {
    child.kill("SIGKILL");
    await closed;
  }
});
