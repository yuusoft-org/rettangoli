import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import generate from "../src/cli/generate.js";
import { startWebServer, takeScreenshots } from "../src/common.js";
import {
  availablePort,
  createTempProject,
  inProjectDir,
  writeProjectFile,
} from "./support/temp-project.js";

// In a real browser: specs whose names need URL encoding are captured from their own page
// (not the server's "Not Found" page), and a VT-built URL that answers 404 fails the task.

const describeE2E = process.env.VT_E2E === "1" ? describe.sequential : describe.skip;

const NAMES = ["my file", "日本", "100%", "a#b"];

describeE2E("encoded spec paths in a real browser", () => {
  let project;

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  it("captures each spec's own page", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    project = createTempProject({ prefix: "rettangoli-vt-e2e-05-" });
    writeProjectFile(project.root, "rettangoli.config.yaml", "vt:\n  path: ./vt\n  sections:\n    - title: Forms\n      files: forms\n");
    writeProjectFile(
      project.root,
      "vt/templates/default.html",
      "<!doctype html><html><body style=\"margin:0;background:rgb(0,170,0);min-height:100vh\">{{ content }}</body></html>\n",
    );
    for (const name of NAMES) {
      writeProjectFile(project.root, `vt/specs/forms/${name}.html`, `<p>${name}</p>\n`);
    }

    const port = await availablePort();
    await inProjectDir(project.root, () => generate({ port, timeout: 10000 }));

    for (const name of NAMES) {
      const shot = join(project.root, ".rettangoli/vt/_site/candidate/forms", `${name}-01.webp`);
      const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
      // Top-left pixel: the template's green, not the white "Not Found" page.
      expect([data[0], data[1], data[2]].map((value) => Math.round(value / 10))).toEqual([0, 17, 0]);
      expect(info.width).toBeGreaterThan(0);
    }
  }, 60000);

  it("fails the task when the spec's page is missing", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    project = createTempProject({ prefix: "rettangoli-vt-e2e-05-" });
    const siteDir = join(project.root, "_site");
    writeProjectFile(project.root, "_site/candidate/forms/plain.html", "<p>plain</p>\n");
    const port = await availablePort();
    const server = await startWebServer(siteDir, join(project.root, "static"), port);
    try {
      await expect(takeScreenshots({
        generatedFiles: [
          { path: "forms/plain.html", frontMatter: {} },
          { path: "forms/gone.html", frontMatter: {} },
        ],
        serverUrl: `http://localhost:${port}`,
        screenshotsDir: join(siteDir, "candidate"),
        metricsPath: join(project.root, "metrics.json"),
        workerCount: 1,
        maxRetries: 0,
        waitStrategy: "load",
      })).rejects.toThrow(
        "Failed to process 1 screenshot file(s):\n"
          + `- forms/gone.html: Worker 1 failed "forms/gone.html": Navigation to http://localhost:${port}/candidate/forms/gone.html returned HTTP 404 (spec "forms/gone.html").`,
      );
    } finally {
      server.close();
    }
  }, 60000);
});
