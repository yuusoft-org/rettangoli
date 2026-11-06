import { fileURLToPath } from "node:url";
import { dump } from "js-yaml";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import generate from "../src/cli/generate.js";
import { runCaptureScheduler } from "../src/capture/capture-scheduler.js";
import { startWebServer } from "../src/common.js";
import { readGolden, shouldUpdateGolden, syncGolden } from "./support/record-goldens.mjs";
import { createTempProject, inProjectDir, writeProjectFile } from "./support/temp-project.js";

// Freezes what generate() hands to the capture scheduler, tasks included, for a matrix of
// CLI options, vt config values and frontmatter overrides. Playwright never runs: the
// scheduler and the web server are stubbed, the rest of generate() (config reading, option
// resolution, HTML generation, selector filtering, task planning) is real.
//
// Re-record after an intentional change: UPDATE_GOLDEN=1 bunx vitest run spec/capture-options-golden.spec.js

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

const GOLDEN_PATH = fileURLToPath(new URL("./fixtures/capture-options/golden.json", import.meta.url));

const BASE_SECTIONS = [
  { title: "Pages", files: "pages" },
  {
    title: "Forms",
    type: "groupLabel",
    items: [{ title: "Inputs", files: "forms/inputs" }],
  },
];

const BASE_SPECS = {
  "pages/home.html": { body: "<main>home</main>" },
  "pages/steps.yaml": {
    frontMatter: {
      title: "Steps",
      steps: [{ action: "click", x: 1, y: 2 }, { action: "wait", ms: 5 }],
    },
    body: "steps: []",
  },
  "forms/inputs/text.html": { frontMatter: { title: "Text" }, body: "<input>" },
};

const SCENARIOS = [
  { id: "defaults" },
  {
    id: "config-values",
    config: { port: 4010, concurrency: 2, timeout: 41000, waitEvent: "cfg:ready", isolationMode: "strict" },
  },
  {
    id: "cli-overrides-config",
    config: { port: 4010, concurrency: 2, timeout: 41000, waitEvent: "cfg:ready", isolationMode: "fast" },
    options: { port: 4020, concurrency: 5, timeout: 12000, waitEvent: "cli:ready", isolation: "strict", headless: false },
  },
  { id: "cli-isolation-strict", options: { isolation: "strict" } },
  { id: "config-url", config: { url: "/app/index.html" } },
  { id: "config-absolute-url", config: { url: "http://127.0.0.1:5000/app?x=1" } },
  { id: "cli-url-overrides-config", config: { url: "/app/" }, options: { url: "http://localhost:6000/shell" } },
  {
    id: "frontmatter-url-resolves-against-config-url",
    config: { url: "http://127.0.0.1:5000/app/" },
    specs: {
      "pages/home.html": { frontMatter: { url: "other/page.html" }, body: "<main>home</main>" },
      "pages/steps.yaml": { frontMatter: { url: "/root.html" }, body: "steps: []" },
      "forms/inputs/text.html": { frontMatter: { url: "https://example.com/abs" }, body: "<input>" },
    },
  },
  {
    id: "frontmatter-url-without-config-url",
    specs: { "pages/home.html": { frontMatter: { url: "/spa/route" }, body: "<main>home</main>" } },
  },
  {
    id: "wait-precedence-frontmatter-over-config",
    config: { waitEvent: "cfg:ready" },
    specs: {
      "pages/home.html": { frontMatter: { waitStrategy: "load" }, body: "<main>home</main>" },
      "pages/steps.yaml": { frontMatter: { waitEvent: "fm:ready" }, body: "steps: []" },
      "forms/inputs/text.html": { frontMatter: { waitStrategy: "selector", waitSelector: "#ready" }, body: "<input>" },
      "pages/plain.html": { body: "<main>plain</main>" },
    },
  },
  {
    id: "wait-selector-frontmatter-only",
    specs: {
      "pages/home.html": { frontMatter: { waitSelector: "#app[data-ready]" }, body: "<main>home</main>" },
      "pages/plain.html": { body: "<main>plain</main>" },
    },
  },
  {
    id: "wait-cli-event-beats-config",
    config: { waitEvent: "cfg:ready" },
    options: { waitEvent: "cli:ready" },
  },
  {
    id: "viewports-from-config",
    config: {
      viewport: [
        { id: "desktop", width: 1280, height: 720 },
        { id: "mobile", width: 390, height: 844 },
      ],
    },
  },
  {
    id: "viewports-frontmatter-override",
    config: { viewport: { id: "desktop", width: 1280, height: 720 } },
    specs: {
      "pages/home.html": {
        frontMatter: { viewport: [{ id: "tablet", width: 768, height: 1024 }, { id: "phone", width: 360, height: 640 }] },
        body: "<main>home</main>",
      },
      "pages/plain.html": { body: "<main>plain</main>" },
      "forms/inputs/text.html": { frontMatter: { viewport: { id: "wide", width: 1920, height: 1080 } }, body: "<input>" },
    },
  },
  {
    id: "skip-screenshot-frontmatter",
    specs: {
      ...BASE_SPECS,
      "pages/skipped.html": { frontMatter: { skipScreenshot: true }, body: "<main>skipped</main>" },
    },
  },
  {
    id: "all-specs-skip-screenshot",
    specs: { "pages/skipped.html": { frontMatter: { skipScreenshot: true }, body: "<main>skipped</main>" } },
  },
  {
    id: "frontmatter-passthrough",
    specs: {
      "pages/home.html": {
        frontMatter: {
          title: "Home",
          description: "A page",
          diffThreshold: 2.5,
          skipInitialScreenshot: true,
          useBrowserScreenshot: true,
          custom: { nested: [1, "two"] },
        },
        body: "<main>home</main>",
      },
    },
  },
  { id: "config-skip-screenshots", config: { skipScreenshots: true } },
  { id: "cli-skip-screenshots", options: { skipScreenshots: true } },
  { id: "capture-screenshots-false-beats-everything", options: { captureScreenshots: false } },
  { id: "capture-screenshots-true-beats-config-skip", config: { skipScreenshots: true }, options: { captureScreenshots: true } },
  { id: "selector-folder", options: { folder: "pages" } },
  { id: "selector-folder-nested", options: { folder: "forms/inputs" } },
  { id: "selector-group", options: { group: "Inputs" } },
  { id: "selector-item", options: { item: "pages/home" } },
  { id: "selector-folder-and-item", options: { folder: "forms", item: "pages/steps.yaml" } },
  { id: "selector-matches-nothing", options: { folder: "nope" } },
  { id: "custom-vt-path", config: { path: "./visual" }, vtDir: "visual" },
  { id: "cli-vt-path", options: { vtPath: "./visual" }, vtDir: "visual" },
  { id: "error-invalid-concurrency", options: { concurrency: 0 } },
  { id: "error-invalid-timeout", config: { timeout: 30000 }, options: { timeout: -5 } },
  { id: "error-service-needs-url", config: { service: { start: "node server.js" } } },
  { id: "error-unknown-group-selector", options: { group: "Missing" } },
  {
    id: "error-invalid-frontmatter",
    specs: { "pages/bad.html": { frontMatter: { waitStrategy: "event" }, body: "<main>bad</main>" } },
  },
];

function writeSpecs(root, vtDir, specs) {
  for (const [relativePath, { frontMatter, body }] of Object.entries(specs)) {
    const frontMatterBlock = frontMatter ? `---\n${dump(frontMatter)}---\n` : "";
    writeProjectFile(root, `${vtDir}/specs/${relativePath}`, `${frontMatterBlock}${body}\n`);
  }
}

const LOG_PREFIXES = ["Skipping screenshots", "No files selected", "Selector scope"];

async function runScenario(scenario) {
  const project = createTempProject({ prefix: "rettangoli-vt-capture-options-" });
  const logs = [];
  vi.spyOn(console, "log").mockImplementation((...args) => {
    const message = args.join(" ");
    if (LOG_PREFIXES.some((prefix) => message.startsWith(prefix))) {
      logs.push(message);
    }
  });
  try {
    const config = { path: "./vt", sections: BASE_SECTIONS, ...scenario.config };
    writeProjectFile(project.root, "rettangoli.config.yaml", dump({ vt: config }));
    writeSpecs(project.root, scenario.vtDir ?? "vt", scenario.specs ?? BASE_SPECS);

    let error = null;
    try {
      await inProjectDir(project.root, () => generate(scenario.options ?? {}));
    } catch (caught) {
      error = caught.message;
    }
    const [schedulerOptions] = vi.mocked(runCaptureScheduler).mock.calls[0] ?? [];
    return JSON.parse(
      JSON.stringify({
        error,
        webServer: vi.mocked(startWebServer).mock.calls[0] ?? null,
        scheduler: schedulerOptions ?? null,
        logs,
      }),
    );
  } finally {
    project.cleanup();
  }
}

describe.sequential("generate() capture options", { timeout: 30_000 }, () => {
  const golden = readGolden(GOLDEN_PATH) ?? {};
  const recorded = {};

  beforeEach(() => {
    vi.mocked(runCaptureScheduler).mockClear();
    vi.mocked(startWebServer).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    if (shouldUpdateGolden()) {
      syncGolden(GOLDEN_PATH, recorded, { expandDepth: 2 });
    }
  });

  it("has a golden entry for every scenario and nothing else", () => {
    if (shouldUpdateGolden()) {
      return;
    }
    expect(Object.keys(golden)).toEqual(SCENARIOS.map((scenario) => scenario.id));
  });

  for (const scenario of SCENARIOS) {
    it(scenario.id, async () => {
      const actual = await runScenario(scenario);
      recorded[scenario.id] = actual;
      if (!shouldUpdateGolden()) {
        expect(actual).toEqual(golden[scenario.id]);
      }
    });
  }
});
