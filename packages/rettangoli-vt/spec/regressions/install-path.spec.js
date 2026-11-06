import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, symlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createTempProject, writeProjectFile } from "../support/temp-project.js";

// Library templates and static files were located with
// `new URL("./templates", import.meta.url).pathname`, which keeps percent-encoding. Installed
// under a path with a space or a non-ASCII character ("My Projects", "é"), generate, report and
// the watch site failed with ENOENT on ".../My%20Projects/...".

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));

// The directory that holds VT's dependencies (the package's own node_modules or a hoisted one).
function findDependencyRoot() {
  for (let directory = packageRoot; directory !== dirname(directory); directory = dirname(directory)) {
    if (existsSync(join(directory, "node_modules", "js-yaml"))) return join(directory, "node_modules");
  }
  throw new Error("js-yaml not found above the package");
}

// Runs in a child node process so module URLs are the real file URLs of the copied install.
const SCRIPT = `
import { pathToFileURL } from "node:url";
const [vtRoot] = process.argv.slice(1);
const load = (file) => import(pathToFileURL(vtRoot + "/src/cli/" + file).href);
console.log = () => {};
const { default: generate } = await load("generate.js");
const { default: report } = await load("report.js");
const { generateVtWatchSite } = await load("watch-plugin.js");
await generateVtWatchSite({ cwd: process.cwd() });
await generate({ captureScreenshots: false });
await report({});
process.stdout.write("ok");
`;

describe("install paths with spaces and non-ASCII characters", () => {
  let project = null;

  afterEach(() => {
    project?.cleanup();
    project = null;
  });

  it("generate, report and the watch site find the library templates and static files", () => {
    project = createTempProject({ prefix: "rettangoli-vt-install-path-" });
    const { root } = project;
    const vtRoot = join(root, "My Projects é", "node_modules", "@rettangoli", "vt");
    mkdirSync(vtRoot, { recursive: true });
    cpSync(join(packageRoot, "src"), join(vtRoot, "src"), { recursive: true });
    cpSync(join(packageRoot, "package.json"), join(vtRoot, "package.json"));
    symlinkSync(findDependencyRoot(), join(vtRoot, "node_modules"), "dir");

    const cwd = join(root, "project");
    writeProjectFile(cwd, "rettangoli.config.yaml", "vt:\n  path: vt\n  sections:\n    - title: Basic\n      files: basic\n");
    writeProjectFile(cwd, "vt/specs/basic/hello.html", "---\ntitle: hello\n---\n<div>hello</div>\n");

    const result = spawnSync(process.execPath, ["--input-type=module", "-e", SCRIPT, vtRoot], {
      cwd,
      encoding: "utf8",
    });
    expect(result.stdout, result.stderr).toBe("ok");
    expect(result.status).toBe(0);
    expect(existsSync(join(cwd, ".rettangoli/vt/_site/report.html"))).toBe(true);
  }, 30_000);
});
