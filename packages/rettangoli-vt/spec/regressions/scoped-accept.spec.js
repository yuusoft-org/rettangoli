import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import accept from "../../src/cli/accept.js";
import generate from "../../src/cli/generate.js";
import report from "../../src/cli/report.js";
import {
  createTempProject,
  inProjectDir,
  listFiles,
  solidPixels,
  writeProjectFile,
  writeWebp,
} from "../support/temp-project.js";

// `screenshot --item forms/a` (or an HTML-only `vt generate`) clears every candidate but
// captures only part of the project. An unscoped report then lists every other reference as
// "only in reference", and accept deleted those baselines. generate now records what it captured
// in _site/candidate/.vt-capture.json, and accept keeps references outside that scope.

// Capture is stubbed: one 2x2 WebP per task, colored by spec path (red unless set in `colors`).
const colors = new Map();
vi.mock("../../src/capture/capture-scheduler.js", () => ({
  runCaptureScheduler: vi.fn(async ({ tasks, screenshotsDir }) => {
    for (const task of tasks) {
      const color = colors.get(task.path) ?? [255, 0, 0];
      await writeWebp(join(screenshotsDir, `${task.baseName}-01.webp`), {
        width: 2,
        height: 2,
        pixels: solidPixels(2, 2, color),
      });
    }
    return { summary: { totalTasks: tasks.length, successful: tasks.length, durationMs: 0 }, failures: [] };
  }),
}));

vi.mock("../../src/common.js", async (importOriginal) => ({
  ...(await importOriginal()),
  startWebServer: vi.fn(async () => ({ close() {} })),
}));

const CONFIG = [
  "vt:",
  "  path: ./vt",
  "  sections:",
  "    - title: Forms",
  "      files: forms",
  "    - title: Pages",
  "      files: pages",
  "",
].join("\n");

const BLUE = [0, 0, 255];

describe.sequential("accept keeps references outside the last capture scope", () => {
  let project = null;
  let warnings;

  const inProject = (callback) => inProjectDir(project.root, callback);
  const references = () => listFiles(join(project.root, "vt/reference"));
  const manifest = () =>
    JSON.parse(readFileSync(join(project.root, ".rettangoli/vt/_site/candidate/.vt-capture.json"), "utf8"));
  const screenshot = (options = {}) => inProject(() => generate(options));
  const runReport = (options = {}) => inProject(() => report(options).catch(() => {}));
  const runAccept = () => inProject(() => accept({}));

  beforeEach(async () => {
    colors.clear();
    project = createTempProject({ prefix: "rettangoli-vt-scoped-accept-" });
    writeProjectFile(project.root, "rettangoli.config.yaml", CONFIG);
    writeProjectFile(project.root, "vt/specs/forms/a.html", "<h1>A</h1>\n");
    writeProjectFile(project.root, "vt/specs/forms/b.html", "<h1>B</h1>\n");
    writeProjectFile(project.root, "vt/specs/pages/home.html", "<h1>Home</h1>\n");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    warnings = vi.spyOn(console, "warn").mockImplementation(() => {});

    // 1. Full capture, report, accept: every capture becomes a reference.
    await screenshot();
    await runReport();
    await runAccept();
    expect(references()).toEqual(["forms/a-01.webp", "forms/b-01.webp", "pages/home-01.webp"]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  it("1: a full capture writes an unscoped manifest and accept prunes nothing extra", async () => {
    expect(manifest()).toEqual({ version: 1, screenshots: true, scope: null });
    await screenshot();
    await runReport();
    await runAccept();
    expect(references()).toEqual(["forms/a-01.webp", "forms/b-01.webp", "pages/home-01.webp"]);
    expect(warnings).not.toHaveBeenCalled();
  });

  it("2: --item forms/a, then an unscoped report and accept keeps forms/b and pages/home", async () => {
    colors.set("forms/a.html", BLUE);
    await screenshot({ item: ["forms/a"] });
    expect(manifest()).toEqual({ version: 1, screenshots: true, scope: { folders: [], items: ["forms/a"] } });

    await runReport();
    await runAccept();

    expect(references()).toEqual(["forms/a-01.webp", "forms/b-01.webp", "pages/home-01.webp"]);
    const accepted = readFileSync(join(project.root, "vt/reference/forms/a-01.webp"));
    const captured = readFileSync(join(project.root, ".rettangoli/vt/_site/candidate/forms/a-01.webp"));
    expect(accepted.equals(captured)).toBe(true);
    expect(warnings).toHaveBeenCalledWith(
      'Kept 2 reference image(s) outside the last capture scope; run a full "rtgl vt screenshot" to prune them.',
    );
    expect(console.log).toHaveBeenCalledWith("Done! Changes accepted.");
  });

  it("3: --folder forms after deleting forms/old.html prunes forms/old-01 but keeps pages/home", async () => {
    writeProjectFile(project.root, "vt/specs/forms/old.html", "<h1>Old</h1>\n");
    await screenshot();
    await runReport();
    await runAccept();
    expect(references()).toContain("forms/old-01.webp");

    rmSync(join(project.root, "vt/specs/forms/old.html"));
    await screenshot({ folder: ["forms"] });
    expect(manifest()).toEqual({ version: 1, screenshots: true, scope: { folders: ["forms"], items: [] } });
    await runReport();
    await runAccept();

    expect(references()).toEqual(["forms/a-01.webp", "forms/b-01.webp", "pages/home-01.webp"]);
    expect(warnings).toHaveBeenCalledWith(
      'Kept 1 reference image(s) outside the last capture scope; run a full "rtgl vt screenshot" to prune them.',
    );
  });

  it("3b: --group resolves to the group's folders in the manifest", async () => {
    await screenshot({ group: ["pages"] });
    expect(manifest()).toEqual({ version: 1, screenshots: true, scope: { folders: ["pages"], items: [] } });
  });

  it("4: an HTML-only generate followed by report and accept deletes nothing", async () => {
    await screenshot({ captureScreenshots: false });
    expect(manifest()).toEqual({ version: 1, screenshots: false, scope: null });
    await runReport();
    await runAccept();

    expect(references()).toEqual(["forms/a-01.webp", "forms/b-01.webp", "pages/home-01.webp"]);
    expect(warnings).toHaveBeenCalledWith(
      'Kept 3 reference image(s) outside the last capture scope; run a full "rtgl vt screenshot" to prune them.',
    );
  });

  it.each([
    ["every spec is deleted", (root) => rmSync(join(root, "vt/specs"), { recursive: true, force: true })],
    ["every spec has skipScreenshot", (root) => {
      for (const spec of ["forms/a.html", "forms/b.html", "pages/home.html"]) {
        writeProjectFile(root, `vt/specs/${spec}`, "---\nskipScreenshot: true\n---\n<h1>Skipped</h1>\n");
      }
    }],
  ])("4b: a full capture that selects no files (%s) still prunes every reference", async (_, prepare) => {
    prepare(project.root);
    await screenshot();
    expect(manifest()).toEqual({ version: 1, screenshots: true, scope: null });
    await runReport();
    await runAccept();

    expect(references()).toEqual([]);
    expect(warnings).not.toHaveBeenCalled();
  });

  it("5: without a manifest, accept deletes every reference-only image as before", async () => {
    await screenshot({ item: ["forms/a"] });
    rmSync(join(project.root, ".rettangoli/vt/_site/candidate/.vt-capture.json"));
    await runReport();
    await runAccept();

    expect(references()).toEqual(["forms/a-01.webp"]);
    expect(warnings).not.toHaveBeenCalled();
  });
});
