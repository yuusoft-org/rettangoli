import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import generate from "../src/cli/generate.js";
import report from "../src/cli/report.js";
import { generateVtWatchSite } from "../src/cli/watch-plugin.js";
import { createTempProject, inProjectDir, writeProjectFile } from "./support/temp-project.js";

// Pins how generate, report and watch read rettangoli.config.yaml: the CLI reads the relative
// path and wraps read and parse errors in `Unable to read "<path>": ...`; watch reads the absolute
// path and lets them through. Both reject a config without a "vt" section and a vt.path of "".

const SECTIONS = "  sections:\n    - title: Pages\n      files: pages\n";

const errorOf = (promise) => promise.then(() => null, (error) => error);

describe.sequential("reading rettangoli.config.yaml", () => {
  let project = null;
  let configPath = null;

  beforeEach(() => {
    project = createTempProject({ prefix: "rettangoli-vt-config-" });
    configPath = join(project.root, "rettangoli.config.yaml");
    writeProjectFile(project.root, "vt/specs/pages/home.html", "<p>home</p>");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  const cli = {
    generate: () => inProjectDir(project.root, () => generate({ captureScreenshots: false })),
    report: () => inProjectDir(project.root, () => report()),
  };
  const watch = () => generateVtWatchSite({ cwd: project.root });

  it("wraps a missing file for the CLI and not for watch", async () => {
    for (const run of Object.values(cli)) {
      const error = await errorOf(run());
      expect(error.message).toBe(
        "Unable to read \"rettangoli.config.yaml\": ENOENT: no such file or directory, open 'rettangoli.config.yaml'",
      );
      expect(error.cause.code).toBe("ENOENT");
    }
    const error = await errorOf(watch());
    expect(error.code).toBe("ENOENT");
    expect(error.message).toBe(`ENOENT: no such file or directory, open '${configPath}'`);
    expect(console.error).toHaveBeenCalledWith(`Error reading YAML file ${configPath}:`, error);
  });

  it("wraps a YAML syntax error for the CLI and not for watch", async () => {
    writeProjectFile(project.root, "rettangoli.config.yaml", "vt: [\n");
    for (const run of Object.values(cli)) {
      const error = await errorOf(run());
      expect(error.message).toMatch(/^Unable to read "rettangoli\.config\.yaml": unexpected end of the stream/);
      expect(error.cause.name).toBe("YAMLException");
      expect(console.error).toHaveBeenLastCalledWith("Error reading YAML file rettangoli.config.yaml:", error.cause);
    }
    const error = await errorOf(watch());
    expect(error.name).toBe("YAMLException");
    expect(error.message).toMatch(/^unexpected end of the stream/);
  });

  it.each([
    ["an empty file", ""],
    ["no vt key", "other: 1\n"],
    ["a null vt", "vt:\n"],
    ["a false vt", "vt: false\n"],
  ])("rejects %s as a missing vt section", async (_label, content) => {
    writeProjectFile(project.root, "rettangoli.config.yaml", content);
    for (const run of Object.values(cli)) {
      expect((await errorOf(run())).message).toBe(
        'Invalid "rettangoli.config.yaml": missing required "vt" section.',
      );
    }
    expect((await errorOf(watch())).message).toBe(
      `Invalid "${configPath}": missing required "vt" section.`,
    );
  });

  it("validates the vt section with the path that was read", async () => {
    writeProjectFile(project.root, "rettangoli.config.yaml", "vt: text\n");
    for (const run of Object.values(cli)) {
      expect((await errorOf(run())).message).toBe(
        'Invalid VT config in rettangoli.config.yaml: "vt" must be an object, got string.',
      );
    }
    expect((await errorOf(watch())).message).toBe(
      `Invalid VT config in ${configPath}: "vt" must be an object, got string.`,
    );
  });

  it("rejects vt.path \"\" everywhere", async () => {
    writeProjectFile(project.root, "rettangoli.config.yaml", `vt:\n  path: ""\n${SECTIONS}`);
    for (const run of [...Object.values(cli), watch]) {
      expect((await errorOf(run())).message).toBe('"vt.path" cannot be empty.');
    }
    expect(existsSync(join(project.root, ".rettangoli"))).toBe(false);
  });

  it.each([
    ["missing", ""],
    ["null", "  path:\n"],
  ])("falls back to the vt folder when vt.path is %s", async (_label, pathLine) => {
    writeProjectFile(project.root, "rettangoli.config.yaml", `vt:\n${pathLine}${SECTIONS}`);
    const candidate = join(project.root, ".rettangoli", "vt", "_site", "candidate", "pages", "home.html");

    await cli.generate();
    expect(existsSync(candidate)).toBe(true);

    const context = await watch();
    expect(context.vtPath).toBe(join(project.root, "vt"));
    expect(existsSync(candidate)).toBe(true);
  });
});
