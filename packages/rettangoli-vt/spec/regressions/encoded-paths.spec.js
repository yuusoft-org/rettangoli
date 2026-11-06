import http from "node:http";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createCaptureTasks } from "../../src/capture/spec-loader.js";
import { PlaywrightRunner } from "../../src/capture/playwright-runner.js";
import { generateVtWatchSpecs } from "../../src/cli/watch-plugin.js";
import { startWebServer } from "../../src/common.js";
import { createTempProject, writeProjectFile } from "../support/temp-project.js";

// The built-in capture server looked request paths up without decoding them, so a spec
// named "my file.html" or "日本.html" was requested as "my%20file.html" and captured as the
// server's "Not Found" page, and the run passed. The server now decodes paths (staying inside
// its roots), VT builds URLs that round-trip, and a VT-built URL that answers 4xx/5xx fails the task.
// Watch containment rejected names that merely start with "..", such as "..cache".

const SPEC_NAMES = ["plain.html", "my file.html", "日本.html", "100%.html", "a#b.html", "q?.html"];

describe("the built-in server serves encoded paths", () => {
  let rootDir;
  let server;
  let port;

  const get = (requestPath) => new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port, path: requestPath }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });

  const write = (relativePath, content) => {
    const filePath = join(rootDir, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  };

  beforeAll(async () => {
    rootDir = mkdtempSync(join(tmpdir(), "rettangoli-vt-encoded-paths-"));
    write("secret.txt", "SECRET");
    write("project/_site/index.html", "INDEX");
    for (const name of SPEC_NAMES) {
      write(`project/_site/candidate/forms/${name}`, `PAGE ${name}`);
    }
    write("project/vt/public/theme.css", "STATIC theme");
    write("project/vt/img dir/a b.css", "STATIC spaced");
    vi.spyOn(console, "log").mockImplementation(() => {});
    server = await startWebServer(join(rootDir, "project/_site"), join(rootDir, "project/vt"), 0);
    port = server.address().port;
    vi.restoreAllMocks();
  });

  afterAll(() => {
    server?.close();
    rmSync(rootDir, { recursive: true, force: true });
  });

  it.each([
    ["/candidate/forms/my%20file.html", "PAGE my file.html"],
    ["/candidate/forms/%E6%97%A5%E6%9C%AC.html", "PAGE 日本.html"],
    ["/candidate/forms/100%25.html", "PAGE 100%.html"],
    ["/candidate/forms/a%23b.html", "PAGE a#b.html"],
    ["/candidate/forms/q%3F.html", "PAGE q?.html"],
    ["/img%20dir/a%20b.css", "STATIC spaced"],
  ])("GET %s answers 200 with the file", async (requestPath, body) => {
    expect(await get(requestPath)).toEqual({ status: 200, body });
  });

  it.each([
    ["/", "INDEX"],
    ["/candidate/forms/plain.html", "PAGE plain.html"],
    ["/public/theme.css", "STATIC theme"],
    // Not a valid escape: looked up as sent, as before.
    ["/candidate/forms/100%.html", "PAGE 100%.html"],
  ])("GET %s is served as before", async (requestPath, body) => {
    expect(await get(requestPath)).toEqual({ status: 200, body });
  });

  it.each([
    "/candidate/..%2f..%2f..%2fsecret.txt",
    "/candidate/..%2F..%2F..%2Fsecret.txt",
    "/..%2fsecret.txt",
    "/../../secret.txt",
    "/%2e%2e/%2e%2e/secret.txt",
    "/candidate/forms/missing.html",
  ])("GET %s answers 404", async (requestPath) => {
    expect(await get(requestPath)).toEqual({ status: 404, body: "Not Found" });
  });

  it("answers 400 for a NUL byte", async () => {
    expect((await get("/candidate/forms/plain.html%00")).status).toBe(400);
  });
});

describe("VT-built URLs round-trip through the server's decoding", () => {
  const serverUrl = "http://localhost:3001";

  it("keeps URLs byte-identical for names that need no escaping", () => {
    const tasks = createCaptureTasks(
      [
        { path: "pages/home.html", frontMatter: {} },
        { path: "forms/inputs/text.yaml", frontMatter: {} },
        { path: "windows\\test.yaml", frontMatter: {} },
        { path: "a-b_c.d/e f.htm", frontMatter: {} },
        { path: "日本.html", frontMatter: {} },
      ],
      { serverUrl },
    );
    expect(tasks.map((task) => task.url)).toEqual([
      "http://localhost:3001/candidate/pages/home.html",
      "http://localhost:3001/candidate/forms/inputs/text.html",
      "http://localhost:3001/candidate/windows/test.html",
      "http://localhost:3001/candidate/a-b_c.d/e f.html",
      "http://localhost:3001/candidate/日本.html",
    ]);
  });

  it("escapes %, # and ? so the browser requests the spec's page", () => {
    const tasks = createCaptureTasks(
      SPEC_NAMES.map((name) => ({ path: `forms/${name}`, frontMatter: {} })),
      { serverUrl },
    );
    expect(tasks.map((task) => task.url)).toEqual([
      "http://localhost:3001/candidate/forms/plain.html",
      "http://localhost:3001/candidate/forms/my file.html",
      "http://localhost:3001/candidate/forms/日本.html",
      "http://localhost:3001/candidate/forms/100%25.html",
      "http://localhost:3001/candidate/forms/a%23b.html",
      "http://localhost:3001/candidate/forms/q%3F.html",
    ]);
    for (const [index, task] of tasks.entries()) {
      const parsed = new URL(task.url);
      expect(parsed.search + parsed.hash).toBe("");
      expect(decodeURIComponent(parsed.pathname)).toBe(`/candidate/forms/${SPEC_NAMES[index]}`);
    }
  });

  it("marks only the URLs VT builds itself as vtOwnedUrl", () => {
    const files = [
      { path: "pages/built.html", frontMatter: {} },
      { path: "pages/own.html", frontMatter: { url: "/candidate/pages/own.html" } },
    ];
    expect(createCaptureTasks(files, { serverUrl }).map((task) => task.vtOwnedUrl)).toEqual([true, undefined]);
    expect(
      createCaptureTasks(files, { serverUrl, configUrl: "/app/index.html" }).map((task) => task.vtOwnedUrl),
    ).toEqual([undefined, undefined]);
  });
});

describe("a VT-built URL that answers 4xx/5xx fails the task", () => {
  const createRunner = () => new PlaywrightRunner({
    workerId: 1,
    browser: {},
    screenshotsDir: ".rettangoli/vt/_site/candidate",
    isolationMode: "fast",
    screenshotWaitTime: 0,
    waitStrategy: "load",
    navigationTimeout: 1000,
    readyTimeout: 1000,
    screenshotTimeout: 1000,
  });

  const createPage = (status) => ({
    goto: vi.fn(async () => (status === null ? null : { status: () => status })),
    waitForFunction: vi.fn(async () => {}),
    waitForSelector: vi.fn(async () => {}),
    addInitScript: vi.fn(async () => {}),
    evaluate: vi.fn(async () => {}),
  });

  const createTask = (overrides) => ({
    path: "forms/my file.html",
    url: "http://localhost:3001/candidate/forms/my file.html",
    waitEvent: "vt:ready",
    waitSelector: "#ready",
    ...overrides,
  });

  for (const waitStrategy of ["networkidle", "load", "event", "selector"]) {
    it(`throws before waiting for readiness (${waitStrategy})`, async () => {
      const page = createPage(404);
      await expect(
        createRunner().navigateToReadyState(page, createTask({ waitStrategy, vtOwnedUrl: true }), new Set()),
      ).rejects.toThrow(
        'Navigation to http://localhost:3001/candidate/forms/my file.html returned HTTP 404 (spec "forms/my file.html").',
      );
      expect(page.waitForFunction).not.toHaveBeenCalled();
      expect(page.waitForSelector).not.toHaveBeenCalled();
    });
  }

  it("fails on 5xx too", async () => {
    await expect(
      createRunner().navigateToReadyState(createPage(500), createTask({ waitStrategy: "load", vtOwnedUrl: true }), new Set()),
    ).rejects.toThrow("returned HTTP 500");
  });

  it("leaves user URLs, 2xx/3xx answers and missing responses alone", async () => {
    const runner = createRunner();
    await expect(runner.navigateToReadyState(createPage(404), createTask({ waitStrategy: "load" }), new Set()))
      .resolves.toMatchObject({ strategy: "load" });
    for (const status of [200, 304, null]) {
      await expect(
        runner.navigateToReadyState(createPage(status), createTask({ waitStrategy: "load", vtOwnedUrl: true }), new Set()),
      ).resolves.toMatchObject({ strategy: "load" });
    }
  });
});

describe("watch containment allows names starting with '..'", () => {
  it("isPathInside", async () => {
    // Imported here so the rest of this file also runs against code without the module.
    const { isPathInside } = await import("../../src/path-safety.js");
    expect(isPathInside("/a", "/a")).toBe(true);
    expect(isPathInside("/a", "/a/..cache/x")).toBe(true);
    expect(isPathInside("/a", "/a/b/..")).toBe(true);
    expect(isPathInside("/a", "/a/../b")).toBe(false);
    expect(isPathInside("/a", "/a/..")).toBe(false);
    expect(isPathInside("/a", "/ab")).toBe(false);
    expect(isPathInside("/a", "/b/a")).toBe(false);
  });

  it("generateVtWatchSpecs accepts a '..name' directory under vt/specs (and ignores it as a dot directory)", async () => {
    const project = createTempProject({ prefix: "rettangoli-vt-watch-containment-" });
    try {
      writeProjectFile(project.root, "rettangoli.config.yaml", "vt:\n  path: ./vt\n  sections:\n    - title: Forms\n      files: forms\n");
      writeProjectFile(project.root, "vt/specs/..drafts/a.html", "<div>draft</div>\n");
      const result = await generateVtWatchSpecs({
        cwd: project.root,
        filePaths: [join(project.root, "vt/specs/..drafts/a.html")],
      });
      expect(result.outputPaths).toEqual([]);
    } finally {
      project.cleanup();
    }
  });
});
