// Runs cli.js as a child process inside a throwaway "consumer project" whose
// @rettangoli/* packages are recording fakes (test/fixtures/fake-packages).
// A scenario result captures the exit code, stdout, the significant stderr
// lines and the ordered list of package imports and calls the CLI made.
import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const fakePackagesDirectory = join(testDirectory, "fixtures", "fake-packages");

const packageDirectory = dirname(testDirectory);
const fakePackageNames = ["fe", "check", "vt", "sites", "ui"];

const SCENARIO_TIMEOUT_MS = 20000;

// The rtgl checkout under test: this package, or CLI_UNDER_TEST (for example an
// unmodified copy from before a change, to prove the goldens describe today's code).
function resolveCliDirectory() {
  return resolve(process.env.CLI_UNDER_TEST || packageDirectory);
}

// Finds <dir>/<name>/package.json along the module search path of `cliDir`.
// require.resolve(`${name}/package.json`) cannot be used: commander's export
// map does not expose its package.json.
function findPackageDirectory(cliDirectory, name) {
  const searchPaths =
    createRequire(join(cliDirectory, "package.json")).resolve.paths(name) ?? [];
  for (const searchPath of searchPaths) {
    const candidate = join(searchPath, name);
    if (existsSync(join(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error(`Cannot find dependency "${name}" for ${cliDirectory}`);
}

function link(target, path) {
  mkdirSync(dirname(path), { recursive: true });
  symlinkSync(target, path, "dir");
}

// Builds <root>/app, which looks like a consumer project with rtgl installed.
// rtgl's own code is copied, not symlinked: Node resolves symlinked modules
// from their real path, which would reach the repository's real packages.
function createInstall({ cliDirectory, omitPackages = [] }) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "rtgl-golden-")));
  try {
    const appDirectory = join(root, "app");
    const modulesDirectory = join(appDirectory, "node_modules");
    const rtglDirectory = join(modulesDirectory, "rtgl");

    mkdirSync(rtglDirectory, { recursive: true });
    cpSync(join(cliDirectory, "cli.js"), join(rtglDirectory, "cli.js"));
    cpSync(join(cliDirectory, "package.json"), join(rtglDirectory, "package.json"));
    cpSync(join(cliDirectory, "src"), join(rtglDirectory, "src"), {
      recursive: true,
    });

    const { dependencies = {}, version } = JSON.parse(
      readFileSync(join(cliDirectory, "package.json"), "utf8"),
    );
    for (const name of Object.keys(dependencies)) {
      if (!name.startsWith("@rettangoli/")) {
        link(findPackageDirectory(cliDirectory, name), join(modulesDirectory, name));
      }
    }
    for (const name of fakePackageNames) {
      if (!omitPackages.includes(name)) {
        link(
          join(fakePackagesDirectory, "@rettangoli", name),
          join(modulesDirectory, "@rettangoli", name),
        );
      }
    }

    return {
      root,
      appDirectory,
      cliPath: join(rtglDirectory, "cli.js"),
      traceFile: join(root, "trace.jsonl"),
      version,
    };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Replaces everything that differs between runs or machines: the app root
// (also in its unresolved form, for example /var/... for /private/var/... on
// macOS), the temp dir and the rtgl version.
function createNormalizer({ root, appDirectory, version }) {
  const replacements = [
    [appDirectory, "<APP>"],
    [join(tmpdir(), basename(root), "app"), "<APP>"],
    [realpathSync(tmpdir()), "<TMP>"],
    [tmpdir(), "<TMP>"],
  ];
  const versionPattern = new RegExp(
    `(?<![\\d.])${escapeRegExp(version)}(?![\\d.])`,
    "g",
  );
  return (text) => {
    let result = text.replace(/\r\n/g, "\n");
    for (const [from, to] of replacements) {
      result = result.split(from).join(to);
    }
    return result.replace(versionPattern, "<VERSION>");
  };
}

// Stderr lines worth pinning. Node's source excerpt, stack frames and
// "Node.js vXX" line are left out so goldens do not depend on the Node version.
const SIGNIFICANT_STDERR_LINES = [
  /^(rtgl: |error: |Usage: |fake |\(set RTGL_DEBUG)/,
  /^\w*(Error|Exception)(?: \[[A-Z0-9_]+\])?: /,
  /^\s+code: /,
  /^\s*\[cause\]: /,
  /^\s+caused by: /,
];

function toLines(text) {
  return text === "" ? [] : text.split("\n");
}

export function summarizeStderr(stderr) {
  return toLines(stderr)
    .filter((line) => SIGNIFICANT_STDERR_LINES.some((pattern) => pattern.test(line)));
}

export function hasStackFrames(stderr) {
  return /^\s+at /m.test(stderr);
}

// Import events inside one Promise.all can arrive in either order; sort each
// run of consecutive imports so the trace is deterministic.
function sortImportRuns(events) {
  const sorted = [];
  let run = [];
  const flush = () => {
    run.sort((a, b) => (a.payload < b.payload ? -1 : a.payload > b.payload ? 1 : 0));
    sorted.push(...run);
    run = [];
  };
  for (const event of events) {
    if (event.event === "import") {
      run.push(event);
    } else {
      flush();
      sorted.push(event);
    }
  }
  flush();
  return sorted;
}

function readTrace(traceFile, normalize) {
  if (!existsSync(traceFile)) {
    return [];
  }
  const lines = normalize(readFileSync(traceFile, "utf8")).split("\n").filter(Boolean);
  return sortImportRuns(lines.map((line) => JSON.parse(line)));
}

function spawnCli({ cliPath, argv, cwd, env }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.env.RTGL_RUNTIME || process.execPath, [cliPath, ...argv], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: SCENARIO_TIMEOUT_MS,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (exitCode, signal) =>
      resolvePromise({ exitCode, signal, stdout, stderr }),
    );
  });
}

// scenario: { id, group, argv, files?, cwd?, env?, omitPackages? }
export async function runScenario(scenario, { cliDirectory = resolveCliDirectory() } = {}) {
  const install = createInstall({
    cliDirectory,
    omitPackages: scenario.omitPackages,
  });
  try {
    const normalize = createNormalizer(install);

    for (const [file, content] of Object.entries(scenario.files ?? {})) {
      const path = join(install.appDirectory, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
    const cwd = join(install.appDirectory, scenario.cwd ?? "");
    mkdirSync(cwd, { recursive: true });

    const { exitCode, signal, stdout, stderr } = await spawnCli({
      cliPath: install.cliPath,
      argv: scenario.argv,
      cwd,
      env: {
        PATH: process.env.PATH,
        NO_COLOR: "1",
        FORCE_COLOR: "0",
        ...scenario.env,
        RTGL_TRACE_FILE: install.traceFile,
      },
    });

    return {
      exitCode,
      signal,
      stdout: toLines(normalize(stdout)),
      stderrSummary: summarizeStderr(normalize(stderr)),
      stderrHasStack: hasStackFrames(stderr),
      trace: readTrace(install.traceFile, normalize),
    };
  } finally {
    rmSync(install.root, { recursive: true, force: true });
  }
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])]),
    );
  }
  return value;
}

// Golden files are pretty-printed with sorted keys so diffs stay readable.
export function formatGolden(results) {
  return `${JSON.stringify(sortKeys(results), null, 2)}\n`;
}
