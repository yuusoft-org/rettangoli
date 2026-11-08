import http from "node:http";
import { join } from "node:path";
import { dump } from "js-yaml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import generate from "../src/cli/generate.js";
import report from "../src/cli/report.js";
import { runCaptureScheduler } from "../src/capture/capture-scheduler.js";
import { probeExistingService } from "../src/cli/service-runtime.js";
import {
  availablePort,
  createTempProject,
  inProjectDir,
  listFiles,
  solidPixels,
  writeProjectFile,
  writeWebp,
} from "./support/temp-project.js";

// Runs that compare nothing, config typos and a server that already answers
// at vt.url used to pass silently. They now print "[vt] Warning:" lines; exit status, files and
// results do not change.

vi.mock("../src/capture/capture-scheduler.js", () => ({
  runCaptureScheduler: vi.fn(async ({ tasks }) => ({
    summary: { totalTasks: tasks.length, successful: tasks.length, durationMs: 0 },
    failures: [],
  })),
}));

vi.mock("../src/common.js", async (importOriginal) => ({
  ...(await importOriginal()),
  startWebServer: vi.fn(async () => ({ close() {} })),
}));

const SECTIONS = [{ title: "Components", files: "components" }];

async function startAnsweringServer() {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("already here");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

describe.sequential("[vt] Warning diagnostics", { timeout: 30_000 }, () => {
  let project = null;
  let warnings;
  let logs;

  const vtWarnings = () =>
    warnings.mock.calls.map((args) => args.join(" ")).filter((line) => line.startsWith("[vt] Warning:"));
  const writeConfig = (vt) =>
    writeProjectFile(project.root, "rettangoli.config.yaml", dump({ vt: { path: "./vt", sections: SECTIONS, ...vt } }));
  const runGenerate = (options = {}) =>
    inProjectDir(project.root, () => generate({ captureScreenshots: false, ...options }));
  const runReport = (options = {}) =>
    inProjectDir(project.root, () => report(options).then(() => null, (error) => error));
  const writeImage = (relativePath) =>
    writeWebp(join(project.root, relativePath), { width: 2, height: 2, pixels: solidPixels(2, 2, [255, 0, 0]) });

  beforeEach(() => {
    project = createTempProject({ prefix: "rettangoli-vt-diagnostics-" });
    writeConfig({});
    writeProjectFile(project.root, "vt/specs/components/button.html", "<button>B</button>\n");
    logs = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(runCaptureScheduler).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  describe("generate", () => {
    it("prints no warning for a well-formed project", async () => {
      await runGenerate();
      await runGenerate({ item: "components/button", folder: "components" });
      expect(vtWarnings()).toEqual([]);
    });

    it("warns when the specs directory does not exist and still succeeds", async () => {
      writeConfig({ path: "./visual-tests" });
      await runGenerate();
      expect(vtWarnings()).toEqual([
        '[vt] Warning: specs directory "visual-tests/specs" does not exist. Check "vt.path" in rettangoli.config.yaml.',
      ]);
      expect(listFiles(join(project.root, ".rettangoli/vt/_site/candidate"))).toEqual([".vt-capture.json"]);
    });

    it("warns for each --folder or --item that matches no spec", async () => {
      await runGenerate({ item: ["components/buton", "components/button"], folder: ["component", "components"] });
      expect(vtWarnings()).toEqual([
        '[vt] Warning: --folder "component" matched no specs.',
        '[vt] Warning: --item "components/buton" matched no specs.',
      ]);
      expect(logs.mock.calls.map((args) => args.join(" "))).toContain(
        "Selector scope: 1 file(s) selected, 0 excluded.",
      );
    });

    it("captures nothing and still succeeds when every selector misses", async () => {
      await runGenerate({ captureScreenshots: true, item: "components/buton" });
      expect(vtWarnings()).toEqual(['[vt] Warning: --item "components/buton" matched no specs.']);
      expect(runCaptureScheduler).not.toHaveBeenCalled();
    });

    it("warns about vt.isolation and other unknown vt keys, and keeps using the defaults", async () => {
      writeConfig({ isolation: "strict", screenshotWait: 10 });
      await runGenerate({ captureScreenshots: true });
      expect(vtWarnings()).toEqual([
        '[vt] Warning: rettangoli.config.yaml: unknown key "vt.isolation" is ignored. Did you mean "vt.isolationMode"?',
        '[vt] Warning: rettangoli.config.yaml: unknown key "vt.screenshotWait" is ignored.',
      ]);
      expect(vi.mocked(runCaptureScheduler).mock.calls[0][0].isolationMode).toBe("fast");
    });

    it("warns about frontmatter skipScreenshots and still captures the spec", async () => {
      writeProjectFile(
        project.root,
        "vt/specs/components/typo.html",
        "---\nskipScreenshots: true\nflavor: kept\n---\n<p>typo</p>\n",
      );
      await runGenerate({ captureScreenshots: true });
      expect(vtWarnings()).toEqual([
        '[vt] Warning: components/typo.html: frontmatter key "skipScreenshots" is ignored. Did you mean "skipScreenshot"?',
      ]);
      const { tasks } = vi.mocked(runCaptureScheduler).mock.calls[0][0];
      expect(tasks.map((task) => task.path)).toEqual(["components/button.html", "components/typo.html"]);
    });

    it("warns when vt.url is not an absolute http(s) URL", async () => {
      writeConfig({ url: "/app/index.html" });
      await runGenerate();
      writeConfig({ url: "localhost:3001" });
      await runGenerate();
      writeConfig({ url: "https://example.com/app" });
      await runGenerate();
      expect(vtWarnings()).toEqual([
        '[vt] Warning: rettangoli.config.yaml: "vt.url" should be an absolute http(s) URL, got "/app/index.html".',
        '[vt] Warning: rettangoli.config.yaml: "vt.url" should be an absolute http(s) URL, got "localhost:3001".',
      ]);
    });

    it("warns when something already answers at vt.url before vt.service.start runs", async () => {
      const server = await startAnsweringServer();
      try {
        writeConfig({
          url: server.url,
          service: { start: `node -e "setTimeout(() => {}, 30000)"` },
        });
        await runGenerate({ captureScreenshots: true });
      } finally {
        await server.close();
      }
      expect(vtWarnings()).toEqual([
        `[vt] Warning: ${server.url} already answers (status 200) before vt.service.start runs. VT may capture that server instead of the managed service.`,
      ]);
      const logLines = logs.mock.calls.map((args) => args.join(" "));
      expect(logLines.some((line) => line.startsWith("Starting managed service:"))).toBe(true);
      expect(runCaptureScheduler).toHaveBeenCalledTimes(1);
    });
  });

  describe("report", () => {
    beforeEach(async () => {
      await writeImage(".rettangoli/vt/_site/candidate/components/button-01.webp");
      await writeImage("vt/reference/components/button-01.webp");
    });

    it("prints no warning for a well-formed project", async () => {
      expect(await runReport()).toBe(null);
      expect(await runReport({ item: "components/button" })).toBe(null);
      expect(vtWarnings()).toEqual([]);
    });

    it("warns when the specs directory does not exist and keeps the result", async () => {
      writeConfig({ path: "./visual-tests" });
      // The candidate has no reference under visual-tests/reference, as before.
      expect((await runReport())?.message).toBe("Error generating VT report: Visual differences found in 1 file(s).");
      expect(vtWarnings()).toEqual([
        '[vt] Warning: specs directory "visual-tests/specs" does not exist. Check "vt.path" in rettangoli.config.yaml.',
      ]);
    });

    it("warns for a selector that matches no image and for an empty scope", async () => {
      expect(await runReport({ item: "components/buton" })).toBe(null);
      expect(await runReport({ folder: "component" })).toBe(null);
      expect(vtWarnings()).toEqual([
        '[vt] Warning: --item "components/buton" matched no images.',
        "[vt] Warning: the selected scope contains no images, so nothing was compared.",
        '[vt] Warning: --folder "component" matched no images.',
        "[vt] Warning: the selected scope contains no images, so nothing was compared.",
      ]);
    });

    it("still fails on a real difference and warns only about the unmatched selector", async () => {
      await writeWebp(join(project.root, ".rettangoli/vt/_site/candidate/components/button-01.webp"), {
        width: 2,
        height: 2,
        pixels: solidPixels(2, 2, [0, 0, 255]),
      });
      const error = await runReport({ item: ["components/button", "components/buton"] });
      expect(error?.message).toBe("Error generating VT report: Visual differences found in 1 file(s).");
      expect(vtWarnings()).toEqual(['[vt] Warning: --item "components/buton" matched no images.']);
    });

    it("warns about config typos", async () => {
      writeConfig({ isolation: "strict" });
      expect(await runReport()).toBe(null);
      expect(vtWarnings()).toEqual([
        '[vt] Warning: rettangoli.config.yaml: unknown key "vt.isolation" is ignored. Did you mean "vt.isolationMode"?',
      ]);
    });
  });

  describe("probeExistingService", () => {
    it("returns false without a warning when nothing listens", async () => {
      const port = await availablePort();
      expect(await probeExistingService(`http://127.0.0.1:${port}`)).toBe(false);
      expect(vtWarnings()).toEqual([]);
    });

    it("gives up after its timeout when the server never answers", async () => {
      const net = await import("node:net");
      const sockets = new Set();
      const server = net.createServer((socket) => sockets.add(socket));
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      try {
        const started = Date.now();
        expect(await probeExistingService(`http://127.0.0.1:${server.address().port}`, 200)).toBe(false);
        expect(Date.now() - started).toBeLessThan(2000);
      } finally {
        sockets.forEach((socket) => socket.destroy());
        server.close();
      }
      expect(vtWarnings()).toEqual([]);
    });
  });
});
