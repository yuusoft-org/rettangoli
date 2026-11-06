import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

// Finds the copy of package `name` that a module at `fromFile` would load: the
// first <dir>/<name>/package.json on its module search path. Returns
// { dir, version } (dir is the real path) or null.
// require.resolve(`${name}/package.json`) cannot be used: @rettangoli/fe's
// exports map does not expose its package.json.
function findPackage(fromFile, name) {
  const searchPaths = createRequire(fromFile).resolve.paths(name) ?? [];
  for (const searchPath of searchPaths) {
    const dir = join(searchPath, name);
    const packageJsonPath = join(dir, "package.json");
    if (existsSync(packageJsonPath)) {
      const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      return { dir: realpathSync(dir), version };
    }
  }
  return null;
}

// The copy the project in `cwd` resolves (fe build bundles this runtime).
export function findProjectPackage(cwd, name) {
  return findPackage(join(cwd, "package.json"), name);
}

// The copy rtgl itself loads (fe watch serves this runtime).
export function findBundledPackage(name) {
  return findPackage(new URL("../package.json", import.meta.url), name);
}

// The warning for `rtgl fe <command>` given both copies, or null.
export function describeFeSkew({ command, project, bundled, rtglVersion }) {
  if (typeof bundled?.version !== "string") {
    return null;
  }
  if (!project) {
    if (command !== "build") {
      return null;
    }
    return (
      "rtgl: warning: this project does not install @rettangoli/fe; fe build bundles " +
      "the runtime from the project and cannot resolve it. " +
      `Run npm i -D @rettangoli/fe@${bundled.version}`
    );
  }
  // The same version compiles to the same code, wherever it is installed.
  if (
    typeof project.version !== "string" ||
    project.dir === bundled.dir ||
    project.version === bundled.version
  ) {
    return null;
  }
  return (
    `rtgl: warning: this project resolves @rettangoli/fe@${project.version} but ` +
    `rtgl ${rtglVersion} runs @rettangoli/fe@${bundled.version}; fe build bundles the ` +
    "project's runtime while fe watch serves rtgl's. Align @rettangoli/fe and rtgl " +
    `(upgrade rtgl, or pin @rettangoli/fe@${bundled.version}).`
  );
}

let feSkewChecked = false;

// Called by `fe build` and `fe watch` before they start fe. Prints at most one
// warning per process, and never fails the command.
export function warnFeSkew({ cwd, command, rtglVersion, stderr = process.stderr }) {
  if (feSkewChecked) {
    return;
  }
  feSkewChecked = true;
  let message;
  try {
    message = describeFeSkew({
      command,
      project: findProjectPackage(cwd, "@rettangoli/fe"),
      bundled: findBundledPackage("@rettangoli/fe"),
      rtglVersion,
    });
  } catch {
    return;
  }
  if (message) {
    stderr.write(`${message}\n`);
  }
}
