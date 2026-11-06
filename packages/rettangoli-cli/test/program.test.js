// In-process tests of the command tree: parse an argv array against fake
// packages and check what each command passes to them. The fast way to test a
// new flag; test/cli-golden.test.js (real processes) remains the authority.
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, before, test } from "node:test";
import { createProgram } from "../src/program.js";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));

// The commands read rettangoli.config.yaml from process.cwd(). Each test file
// runs in its own process, so changing directory here affects only this file.
const originalDirectory = process.cwd();
let projectDirectory;

before(() => {
  // realpath: process.cwd() reports /private/var for /var on macOS.
  projectDirectory = realpathSync(mkdtempSync(join(tmpdir(), "rtgl-program-")));
  mkdirSync(join(projectDirectory, "src", "components"), { recursive: true });
  process.chdir(projectDirectory);
});

after(() => {
  process.chdir(originalDirectory);
  rmSync(projectDirectory, { recursive: true, force: true });
});

afterEach(() => {
  rmSync(join(projectDirectory, "rettangoli.config.yaml"), { force: true });
});

function writeConfig(yaml) {
  writeFileSync(join(projectDirectory, "rettangoli.config.yaml"), yaml);
}

const PACKAGE_FUNCTIONS = {
  "@rettangoli/check/cli": ["check"],
  "@rettangoli/fe/cli": ["build", "check", "scaffold", "watch", "examples", "resolveServeContext"],
  "@rettangoli/sites/cli": ["buildSite", "watchSite", "initSite"],
  "@rettangoli/sites/watch-client": ["createViteWatchClientModuleSource"],
  "@rettangoli/ui/cli": ["buildSvg"],
  "@rettangoli/vt/cli": ["generate", "screenshot", "report", "accept", "createRettangoliVtWatchPlugin"],
};

const RESULTS = {
  resolveServeContext: () => ({ publicEntryPath: "/public/main.js" }),
  createRettangoliVtWatchPlugin: (args) => ({ name: "vt-plugin", args }),
};

// Runs `rtgl ...args` with fake packages. Returns the specifiers loaded and
// the package calls, in order.
async function run(...args) {
  const loaded = [];
  const calls = [];
  const load = async (specifier) => {
    loaded.push(specifier);
    return Object.fromEntries(
      PACKAGE_FUNCTIONS[specifier].map((name) => [
        name,
        (...callArgs) => {
          calls.push({ fn: name, args: callArgs });
          return RESULTS[name]?.(...callArgs);
        },
      ]),
    );
  };
  await createProgram({ load }).parseAsync(["node", "rtgl", ...args]);
  return { loaded, calls };
}

test("--version prints the package version", async () => {
  let output = "";
  const program = createProgram({ load: async () => ({}) })
    .exitOverride()
    .configureOutput({ writeOut: (text) => (output += text) });

  await assert.rejects(program.parseAsync(["node", "rtgl", "--version"]), {
    code: "commander.version",
  });
  assert.equal(output, `${version}\n`);
});

test("check passes its options and the defaults", async () => {
  const { loaded, calls } = await run("check", "--dir", "a", "--dir", "b", "--no-yahtml");

  assert.deepEqual(loaded, ["@rettangoli/check/cli"]);
  assert.deepEqual(calls, [
    {
      fn: "check",
      args: [
        {
          cwd: projectDirectory,
          dirs: ["a", "b"],
          format: "text",
          warnAsError: false,
          includeYahtml: false,
          includeExpression: false,
          includeStyle: undefined,
          watch: false,
          watchIntervalMs: 800,
        },
      ],
    },
  ]);
});

test("fe build merges the fe config into the options", async () => {
  writeConfig("fe:\n  dirs: [src/components]\n  outfile: dist/main.js\n");
  const { loaded, calls } = await run("fe", "build", "-d", "-s", "src/setup.web.js");

  assert.deepEqual(loaded, ["@rettangoli/fe/cli"]);
  assert.deepEqual(calls, [
    {
      fn: "build",
      args: [
        {
          development: true,
          setupPath: "src/setup.web.js",
          dirs: ["src/components"],
          i18n: null,
          setup: "src/setup.web.js",
          outfile: "dist/main.js",
        },
      ],
    },
  ]);
});

test("fe watch with watchVt adds the vt watch plugin", async () => {
  writeConfig("fe:\n  dirs: [src/components]\n  watchVt: true\n");
  const { loaded, calls } = await run("fe", "watch", "-p", "4000");

  assert.deepEqual(loaded, [
    "@rettangoli/fe/cli",
    "@rettangoli/vt/cli",
    "@rettangoli/sites/watch-client",
  ]);
  assert.deepEqual(
    calls.map(({ fn }) => fn),
    ["resolveServeContext", "createRettangoliVtWatchPlugin", "watch"],
  );
  assert.deepEqual(calls[0].args, [{ cwd: projectDirectory, outfile: undefined }]);

  const [watchOptions] = calls[2].args;
  assert.equal(watchOptions.port, 4000);
  assert.equal(watchOptions.publicDir, false);
  assert.equal(watchOptions.vitePlugins.length, 1);
  const { cwd, publicEntryPath, createWatchClientModuleSource } = watchOptions.vitePlugins[0].args;
  assert.equal(cwd, projectDirectory);
  assert.equal(publicEntryPath, "/public/main.js");
  createWatchClientModuleSource();
  assert.equal(calls.at(-1).fn, "createViteWatchClientModuleSource");
});

test("fe examples reads dirs and the output directory from the config", async () => {
  writeConfig("fe:\n  dirs: [src/components]\n");
  const { calls } = await run("fe", "examples");

  assert.deepEqual(calls, [
    {
      fn: "examples",
      args: [{ dirs: ["src/components"], outputDir: "./vt/specs/examples" }],
    },
  ]);
});

test("vt generate prints the version and sets vtPath from the config", async (t) => {
  const log = t.mock.method(console, "log", () => {});
  writeConfig("vt:\n  path: visual\n");
  const { loaded, calls } = await run("vt", "generate", "--headed", "--folder", "a");

  assert.deepEqual(loaded, ["@rettangoli/vt/cli"]);
  assert.deepEqual(log.mock.calls.map((call) => call.arguments), [[`rtgl v${version}`]]);
  assert.deepEqual(calls, [
    {
      fn: "generate",
      args: [
        {
          folder: ["a"],
          group: [],
          item: [],
          headed: true,
          headless: false,
          vtPath: "visual",
          captureScreenshots: false,
        },
      ],
    },
  ]);
});

test("vt report passes the parsed thresholds", async () => {
  writeConfig("vt: {}\n");
  const { calls } = await run("vt", "report", "--diff-threshold", "0.5", "--color-threshold", "0.1");

  assert.deepEqual(calls, [
    {
      fn: "report",
      args: [
        {
          vtPath: "vt",
          compareMethod: undefined,
          colorThreshold: 0.1,
          diffThreshold: 0.5,
          folder: [],
          group: [],
          item: [],
        },
      ],
    },
  ]);
});

test("sites build reports success unless --quiet", async (t) => {
  const log = t.mock.method(console, "log", () => {});

  const loud = await run("sites", "build", "--root-dir", "site");
  assert.deepEqual(loud.calls, [
    { fn: "buildSite", args: [{ rootDir: "site", outputPath: "./_site", quiet: false }] },
  ]);
  assert.deepEqual(log.mock.calls.map((call) => call.arguments), [["Build completed successfully!"]]);

  const quiet = await run("sites", "build", "-q");
  assert.deepEqual(quiet.calls, [
    { fn: "buildSite", args: [{ rootDir: "./", outputPath: "./_site", quiet: true }] },
  ]);
  assert.equal(log.mock.callCount(), 1);
});

test("sites watch passes its defaults", async () => {
  const { calls } = await run("sites", "watch");

  assert.deepEqual(calls, [
    {
      fn: "watchSite",
      args: [
        {
          port: 3001,
          host: "127.0.0.1",
          rootDir: ".",
          outputPath: "./_site",
          reloadMode: "body",
          quiet: false,
        },
      ],
    },
  ]);
});

test("ui build-svg falls back to ui.svg in the config", async () => {
  writeConfig("ui:\n  svg:\n    dir: icons\n    outfile: dist/icons.js\n");
  const { loaded, calls } = await run("ui", "build-svg");

  assert.deepEqual(loaded, ["@rettangoli/ui/cli"]);
  assert.deepEqual(calls, [
    { fn: "buildSvg", args: [{ dir: "icons", outfile: "dist/icons.js" }] },
  ]);
});
