// Config errors that used to crash with a TypeError, or were reported as the
// wrong problem, now print one clear message. Values that work today must keep
// working.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { readConfig, requireConfig } from "../src/config.js";
import { CliUserError } from "../src/errors.js";
import { resolveFeOptions } from "../src/fe-config.js";
import { runScenario } from "./support/cli-harness.js";

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function project(files = {}) {
  const directory = mkdtempSync(join(tmpdir(), "rtgl-config-validation-"));
  temporaryDirectories.push(directory);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(directory, file, ".."), { recursive: true });
    writeFileSync(join(directory, file), content);
  }
  return directory;
}

const configFile = (yaml) => ({ "rettangoli.config.yaml": yaml });
const feProject = (feLines = "") => ({
  ...configFile(`fe:\n  dirs:\n    - src/components\n${feLines}`),
  "src/components/.keep": "",
});

function userError(message) {
  return (error) => {
    assert.ok(error instanceof CliUserError, `expected a CliUserError, got ${error}`);
    assert.equal(error.message, message);
    return true;
  };
}

function resolveFe(files, command, options = {}) {
  const directory = project(files);
  return resolveFeOptions(requireConfig(directory), directory, options, { command });
}

// ---------------------------------------------------------------- requireConfig
test("requireConfig: a missing config is 'not found'", () => {
  assert.throws(() => requireConfig(project()), userError("rettangoli.config.yaml not found"));
});

test("requireConfig: an empty, comment-only or falsy config is 'empty'", () => {
  for (const yaml of ["", "# only a comment\n", "~\n", "false\n", "0\n", '""\n']) {
    assert.throws(
      () => requireConfig(project(configFile(yaml))),
      userError("rettangoli.config.yaml is empty"),
      JSON.stringify(yaml),
    );
  }
});

test("requireConfig: invalid YAML keeps readConfig's message and cause", () => {
  const directory = project(configFile("fe:\n  dirs: [\n"));
  const original = (() => {
    try {
      readConfig(directory);
    } catch (error) {
      return error;
    }
  })();
  assert.throws(
    () => requireConfig(directory),
    (error) => {
      assert.ok(error instanceof CliUserError);
      assert.equal(error.message, original.message);
      assert.match(error.message, /^Error reading config file ".*rettangoli\.config\.yaml": /);
      assert.equal(error.cause.message, original.cause.message);
      return true;
    },
  );
});

test("requireConfig: returns any other config unchanged", () => {
  assert.deepEqual(requireConfig(project(configFile("vt:\n  path: x\n"))), { vt: { path: "x" } });
  assert.equal(requireConfig(project(configFile("42\n"))), 42);
});

// ---------------------------------------------------------------- resolveFeOptions
test("resolveFeOptions: missing fe section or dirs", () => {
  for (const yaml of ["other: 1\n", "fe:\n  setup: s.js\n", "fe:\n  dirs: []\n", "42\n"]) {
    for (const command of ["build", "check", "watch"]) {
      assert.throws(
        () => resolveFe(configFile(yaml), command),
        userError("fe.dirs not found or empty in config"),
        `${command} ${JSON.stringify(yaml)}`,
      );
    }
  }
});

test("resolveFeOptions: string dirs are reported instead of crashing", () => {
  for (const command of ["build", "check", "watch"]) {
    assert.throws(
      () => resolveFe({ ...configFile("fe:\n  dirs: src/components\n"), "src/components/.keep": "" }, command),
      userError("fe.dirs must be a list of directories, for example dirs: [src/components]"),
    );
  }
});

test("resolveFeOptions: non-string dirs entries are reported with their index", () => {
  const cases = [
    ["[42]", "number at index 0"],
    ["[src/components, ~]", "null at index 1"],
    ["[[a]]", "array at index 0"],
    ["[{a: 1}]", "object at index 0"],
    ["[true]", "boolean at index 0"],
  ];
  for (const [dirs, got] of cases) {
    assert.throws(
      () => resolveFe({ ...configFile(`fe:\n  dirs: ${dirs}\n`), "src/components/.keep": "" }, "build"),
      userError(`fe.dirs entries must be strings (got ${got})`),
    );
  }
});

test("resolveFeOptions: missing directories keep their message", () => {
  assert.throws(
    () => resolveFe(configFile("fe:\n  dirs:\n    - a\n    - b\n"), "check"),
    userError("Directories do not exist: a, b"),
  );
});

test("resolveFeOptions: a non-string outfile is reported for build and watch", () => {
  for (const [value, got] of [["42", "number"], ["true", "boolean"], ["[a]", "array"], ["{}", "object"]]) {
    for (const command of ["build", "watch"]) {
      assert.throws(
        () => resolveFe(feProject(`  outfile: ${value}\n`), command),
        userError(`fe.outfile must be a file path string (got ${got})`),
      );
    }
    // fe check never reads fe.outfile, and a command-line outfile wins.
    assert.doesNotThrow(() => resolveFe(feProject(`  outfile: ${value}\n`), "check"));
    assert.equal(
      resolveFe(feProject(`  outfile: ${value}\n`), "build", { outfile: "cli.js" }).outfile,
      "cli.js",
    );
  }
});

test("resolveFeOptions: setup, watchEntry, publicDir and i18n pass through as today", () => {
  const watchOptions = resolveFe(
    feProject("  setup: 42\n  watchEntry: 42\n  publicDir: 42\n  i18n: 42\n"),
    "watch",
  );
  assert.deepEqual(watchOptions, {
    dirs: ["src/components"],
    i18n: 42,
    setup: 42,
    publicDir: 42,
    watchEntry: 42,
  });
});

test("resolveFeOptions: nullish values behave as today", () => {
  const files = feProject("  setup:\n  outfile: ~\n  publicDir: ~\n  watchEntry: ~\n  i18n: ~\n");
  assert.deepEqual(resolveFe(files, "build"), {
    dirs: ["src/components"],
    i18n: null,
    setup: "setup.js",
  });
  assert.deepEqual(resolveFe(files, "watch"), {
    dirs: ["src/components"],
    i18n: null,
    setup: "setup.js",
    publicDir: null,
    watchEntry: null,
  });
  assert.deepEqual(resolveFe(files, "check"), { dirs: ["src/components"], i18n: null });
});

test("resolveFeOptions: command-line options beat config values", () => {
  const files = feProject(
    "  setup: config-setup.js\n  outfile: config-out.js\n  publicDir: config-pub\n  watchEntry: config-w.js\n",
  );
  assert.deepEqual(
    resolveFe(files, "watch", {
      setupPath: "s.js",
      outfile: "o.js",
      publicDir: "p",
      watchEntry: "w.js",
    }),
    {
      setupPath: "s.js",
      outfile: "o.js",
      publicDir: "p",
      watchEntry: "w.js",
      dirs: ["src/components"],
      i18n: null,
      setup: "s.js",
    },
  );
});

// ---------------------------------------------------------------- through the CLI
function stderrOf(result) {
  return result.stderrSummary.join("\n");
}

async function assertCliError(argv, files, message) {
  const result = await runScenario({ id: argv.join("-"), group: "fe", argv, files });
  assert.equal(result.exitCode, 1, `${argv.join(" ")}: ${stderrOf(result)}`);
  assert.deepEqual(result.stderrSummary, [`rtgl: ${message}`], argv.join(" "));
  assert.equal(result.stderrHasStack, false);
  assert.ok(
    result.trace.every((event) => event.event !== "call"),
    `${argv.join(" ")} must not call the package`,
  );
}

const feCommands = [
  ["fe", "build"],
  ["fe", "check"],
  ["fe", "watch"],
  ["fe", "examples"],
];
const vtCommands = [
  ["vt", "generate"],
  ["vt", "screenshot"],
  ["vt", "report"],
  ["vt", "accept"],
];

test("cli: an empty or falsy config fails every fe and vt command with 'is empty'", async () => {
  for (const yaml of ["", "false\n", "0\n", '""\n']) {
    for (const argv of [...feCommands, ...vtCommands]) {
      await assertCliError(argv, configFile(yaml), "rettangoli.config.yaml is empty");
    }
  }
});

test("cli: fe examples without a config or fe section reports it", async () => {
  await assertCliError(["fe", "examples"], {}, "rettangoli.config.yaml not found");
  for (const yaml of ["other: 1\n", "fe: ~\n", "fe: 42\n", "fe: src\n", "42\n"]) {
    await assertCliError(["fe", "examples"], configFile(yaml), "fe.dirs not found or empty in config");
  }
});

test("cli: fe examples validates fe.dirs like the other fe commands", async () => {
  const cases = [
    ["fe: {}\n", "fe.dirs not found or empty in config"],
    ["fe: []\n", "fe.dirs not found or empty in config"],
    [
      "fe:\n  dirs: src\n",
      "fe.dirs must be a list of directories, for example dirs: [src/components]",
    ],
    ["fe:\n  dirs: [42]\n", "fe.dirs entries must be strings (got number at index 0)"],
    ["fe:\n  dirs: [nope]\n", "Directories do not exist: nope"],
  ];
  for (const [yaml, message] of cases) {
    await assertCliError(["fe", "examples"], configFile(yaml), message);
    await assertCliError(["fe", "check"], configFile(yaml), message);
  }
});

test("cli: fe examples with an empty fe.dirs list still generates nothing", async () => {
  const result = await runScenario({
    id: "examples-empty-dirs",
    group: "fe",
    argv: ["fe", "examples"],
    files: configFile("fe:\n  dirs: []\n"),
  });
  assert.equal(result.exitCode, 0, stderrOf(result));
  const call = result.trace.find((event) => event.event === "call");
  assert.equal(call.payload.fn, "examples");
  assert.deepEqual(call.payload.args[0].dirs, []);
});

test("cli: invalid fe values are reported before any package call", async () => {
  await assertCliError(
    ["fe", "check"],
    configFile('fe:\n  dirs: "src"\n'),
    "fe.dirs must be a list of directories, for example dirs: [src/components]",
  );
  await assertCliError(
    ["fe", "build"],
    configFile("fe:\n  dirs: [42]\n"),
    "fe.dirs entries must be strings (got number at index 0)",
  );
  await assertCliError(
    ["fe", "watch"],
    feProject("  outfile: 42\n"),
    "fe.outfile must be a file path string (got number)",
  );
});

test("cli: nullish fe values still reach the package", async () => {
  const result = await runScenario({
    id: "nullish",
    group: "fe",
    argv: ["fe", "build"],
    files: feProject("  setup:\n  outfile: ~\n"),
  });
  assert.equal(result.exitCode, 0, stderrOf(result));
  const call = result.trace.find((event) => event.event === "call");
  assert.equal(call.payload.fn, "build");
  assert.equal(call.payload.args[0].setup, "setup.js");
});
