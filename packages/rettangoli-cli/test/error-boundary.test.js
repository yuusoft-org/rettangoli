// rtgl prints failures as "rtgl: <message>" and exits 1.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { CliUserError, formatCliError, runWithErrorBoundary } from "../src/errors.js";
import { runScenario } from "./support/cli-harness.js";

const HINT = "(set RTGL_DEBUG=1 to print the stack trace)";

// runWithErrorBoundary sets process.exitCode; the test process must not keep it.
afterEach(() => {
  process.exitCode = undefined;
});

// ---------------------------------------------------------------- formatCliError
test("formatCliError: a plain error prints its message and the debug hint", () => {
  assert.equal(formatCliError(new Error("boom")), `rtgl: boom\n${HINT}`);
});

test("formatCliError: a user error prints only its message", () => {
  assert.equal(
    formatCliError(new CliUserError("rettangoli.config.yaml not found")),
    "rtgl: rettangoli.config.yaml not found",
  );
  assert.equal(new CliUserError("x").name, "CliUserError");
});

test("formatCliError: multi-line messages print as they are", () => {
  const message = "Build failed with 1 error:\n\n[PARSE_ERROR] Unexpected token\n  1 | export const a = ;";
  assert.equal(formatCliError(new CliUserError(message)), `rtgl: ${message}`);
});

test("formatCliError: causes print once each, skipping ones already in the message", () => {
  const root = new Error("disk unplugged");
  const inner = new Error("bad indentation (2:3)", { cause: root });
  const outer = new CliUserError('Error reading config file "x": bad indentation (2:3)', {
    cause: inner,
  });
  assert.equal(
    formatCliError(outer),
    'rtgl: Error reading config file "x": bad indentation (2:3)\n  caused by: disk unplugged',
  );
  assert.equal(
    formatCliError(new Error("outer", { cause: "plain reason" })),
    `rtgl: outer\n  caused by: plain reason\n${HINT}`,
  );
  assert.equal(formatCliError(new Error("x", { cause: null })), `rtgl: x\n${HINT}`);
});

test("formatCliError: a cause cycle stops after five levels", () => {
  const a = new CliUserError("a");
  const b = new Error("b", { cause: a });
  a.cause = b;
  assert.equal(formatCliError(a), "rtgl: a\n  caused by: b");
});

test("formatCliError: non-Error values print without a hint", () => {
  assert.equal(formatCliError("fake check rejection"), "rtgl: fake check rejection");
  assert.equal(formatCliError(undefined), "rtgl: undefined");
  assert.equal(formatCliError({ reason: "x" }), "rtgl: { reason: 'x' }");
});

test("formatCliError: error-like objects print their message", () => {
  // bun throws a ResolveMessage, which is not an Error, for a missing package.
  class ResolveMessage {
    get message() {
      return "Cannot find package '@rettangoli/fe'";
    }
  }
  assert.equal(
    formatCliError(new ResolveMessage()),
    `rtgl: Cannot find package '@rettangoli/fe'\n${HINT}`,
  );
});

test("formatCliError: extra primitive properties the message lacks are listed", () => {
  const error = Object.assign(new Error("Cannot find package '@rettangoli/fe'"), {
    code: "ERR_MODULE_NOT_FOUND",
    id: "/app/src/a.js",
    plugin: "vite:css",
    frame: "1 | a {\n  | ^",
    loc: { line: 1, column: 2 },
    errors: [new Error("nested")],
  });
  error.name = "BuildError";
  Object.defineProperty(error, "hidden", { value: "not enumerable", enumerable: false });
  Object.defineProperty(error, "computed", { get: () => "accessor", enumerable: true });
  assert.equal(
    formatCliError(error),
    [
      "rtgl: Cannot find package '@rettangoli/fe'",
      "  code: ERR_MODULE_NOT_FOUND",
      "  id: /app/src/a.js",
      "  plugin: vite:css",
      "  frame: 1 | a {\n  | ^",
      HINT,
    ].join("\n"),
  );

  const mentioned = Object.assign(new Error("[plugin vite:css] /app/src/a.js: oops"), {
    id: "/app/src/a.js",
    plugin: "vite:css",
  });
  assert.equal(formatCliError(mentioned), `rtgl: [plugin vite:css] /app/src/a.js: oops\n${HINT}`);
  assert.equal(
    formatCliError(Object.assign(new CliUserError("user"), { code: "X" })),
    "rtgl: user",
  );
});

test("formatCliError: programming errors print their stack by default", () => {
  for (const ErrorType of [TypeError, ReferenceError, SyntaxError, RangeError]) {
    const text = formatCliError(new ErrorType("bad value"));
    const [first, ...rest] = text.split("\n");
    assert.equal(first, "rtgl: bad value");
    assert.match(rest.join("\n"), new RegExp(`^${ErrorType.name}: bad value\\n\\s+at `));
    assert.ok(!text.includes(HINT), ErrorType.name);
  }
});

test("formatCliError: debug mode prints the stack, properties and causes", () => {
  const error = Object.assign(new CliUserError("outer", { cause: new Error("inner") }), {
    code: "E_OUTER",
  });
  const text = formatCliError(error, { debug: true });
  assert.ok(text.startsWith("rtgl: outer\n  caused by: inner\nCliUserError: outer\n    at "));
  assert.match(text, /code: 'E_OUTER'/);
  assert.match(text, /\[cause\]: Error: inner/);
  assert.ok(!text.includes(HINT));
  assert.equal(formatCliError("text", { debug: true }), "rtgl: text");
});

// ---------------------------------------------------------------- runWithErrorBoundary
function recorder() {
  const events = [];
  const stream = (name) => ({
    write(text, callback) {
      events.push([name, text]);
      setImmediate(callback);
      return true;
    },
  });
  return {
    events,
    stderr: stream("stderr"),
    stdout: stream("stdout"),
    exit: (code) => events.push(["exit", code]),
  };
}

function settle() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

test("runWithErrorBoundary: a successful main writes nothing and does not exit", async () => {
  const io = recorder();
  let ran = false;
  await runWithErrorBoundary(async () => {
    ran = true;
  }, { ...io, env: {} });
  await settle();
  assert.equal(ran, true);
  assert.deepEqual(io.events, []);
  assert.equal(process.exitCode, undefined);
});

test("runWithErrorBoundary: prints the error, flushes stdout, then exits 1", async () => {
  const io = recorder();
  await runWithErrorBoundary(() => {
    throw new CliUserError("rettangoli.config.yaml not found");
  }, { ...io, env: {} });
  assert.equal(process.exitCode, 1);
  await settle();
  assert.deepEqual(io.events, [
    ["stderr", "rtgl: rettangoli.config.yaml not found\n"],
    ["stdout", ""],
    ["exit", 1],
  ]);
});

test("runWithErrorBoundary: RTGL_DEBUG turns on the stack unless it is 0 or empty", async () => {
  for (const [value, debug] of [["1", true], ["true", true], ["0", false], ["", false]]) {
    const io = recorder();
    await runWithErrorBoundary(() => Promise.reject(new CliUserError("x")), {
      ...io,
      env: { RTGL_DEBUG: value },
    });
    await settle();
    const [, text] = io.events[0];
    assert.equal(text.includes("    at "), debug, `RTGL_DEBUG=${JSON.stringify(value)}`);
  }
});

// ---------------------------------------------------------------- through the CLI
test("cli: a failure exits 1 at once even while a watcher keeps the process alive", async () => {
  const started = Date.now();
  const result = await runScenario({
    id: "keep-alive",
    group: "fe",
    argv: ["fe", "watch"],
    files: {
      "rettangoli.config.yaml": "fe:\n  dirs:\n    - src\n",
      "src/.keep": "",
    },
    env: { FAKE_KEEP_ALIVE: "watch", FAKE_THROW: "watch" },
  });
  assert.equal(result.exitCode, 1);
  assert.ok(Date.now() - started < 3000, `took ${Date.now() - started} ms`);
  assert.deepEqual(result.stderrSummary, [
    "rtgl: fake watch failure",
    "  caused by: fake cause",
    HINT,
  ]);
});

test("cli: invalid YAML prints the config path and parser message, no stack hint", async () => {
  const result = await runScenario({
    id: "badyaml",
    group: "fe",
    argv: ["fe", "build"],
    files: { "rettangoli.config.yaml": "fe:\n  dirs: [\n" },
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.stderrHasStack, false);
  assert.equal(result.stderrSummary.length, 1, result.stderrSummary.join("\n"));
  assert.match(
    result.stderrSummary[0],
    /^rtgl: Error reading config file "<APP>\/rettangoli\.config\.yaml": unexpected end of the stream/,
  );
});

// Node's wording; another RTGL_RUNTIME (bun) words module errors its own way.
const nodeOnly = { skip: process.env.RTGL_RUNTIME ? "RTGL_RUNTIME is set" : false };

test("cli: a missing package is reported with its error code", nodeOnly, async () => {
  const result = await runScenario({
    id: "missing",
    group: "check",
    argv: ["check"],
    omitPackages: ["check"],
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.stderrHasStack, false);
  assert.match(result.stderrSummary[0], /^rtgl: Cannot find package '@rettangoli\/check'/);
  assert.deepEqual(result.stderrSummary.slice(1), ["  code: ERR_MODULE_NOT_FOUND", HINT]);
});
