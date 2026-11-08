import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import generate from "../src/cli/generate.js";
import {
  availablePort,
  createTempProject,
  inProjectDir,
  writeProjectFile,
} from "./support/temp-project.js";

// In a real browser: a page that blocks its main thread, or a page promise that never
// settles, used to hang `vt screenshot` forever. Now the stuck spec fails (after its retry) and
// the healthy spec queued after it, in the same worker, is still captured.

const describeE2E = process.env.VT_E2E === "1" ? describe.sequential : describe.skip;

const SPIN_AFTER_LOAD = "addEventListener('load', () => setTimeout(() => { for (;;) {} }, 0));";

// [isolation, page script, front matter lines, expected error]
const scenarios = {
  "S1 main thread blocked after load (fast)": [
    "fast", SPIN_AFTER_LOAD, "", "Screenshot hook probe did not finish within 3000ms",
  ],
  "S2 main thread blocked after load (strict)": [
    "strict", SPIN_AFTER_LOAD, "", "Screenshot hook probe did not finish within 3000ms",
  ],
  "S3 main thread blocked before load (fast)": [
    "fast", "for (;;) {}", "", "page.goto: Timeout 3000ms exceeded.",
  ],
  "S4 takeVtScreenshotBase64 never settles (fast)": [
    "fast", "window.takeVtScreenshotBase64 = () => new Promise(() => {});", "",
    "window.takeVtScreenshotBase64() did not finish within 3000ms",
  ],
  "S5 assert js never settles (strict)": [
    "strict", "window.neverResolves = () => new Promise(() => {});",
    "skipInitialScreenshot: true\nsteps:\n  - action: assert\n    type: js\n    fn: neverResolves\n    value: true\n",
    "assert js failed: assert js did not finish within 3000ms",
  ],
  "S6 customEvent handler never returns (fast)": [
    "fast", "addEventListener('vt:go', () => { for (;;) {} });",
    "skipInitialScreenshot: true\nsteps:\n  - action: customEvent\n    name: vt:go\n",
    'customEvent "vt:go" did not finish within 3000ms',
  ],
  "S7 blur handler never returns (fast)": [
    "fast",
    "document.addEventListener('DOMContentLoaded', () => document.querySelector('input').addEventListener('blur', () => { for (;;) {} }));",
    "skipInitialScreenshot: true\nsteps:\n  - action: select\n    selector: '#inp'\n    steps:\n      - action: focus\n      - action: blur\n",
    // Locator evaluations get readyTimeout + 5 s, so Playwright's own locator timeout fires first.
    "blur did not finish within 8000ms",
  ],
};

function writeProject(root, script, frontMatter) {
  writeProjectFile(root, "rettangoli.config.yaml", `vt:
  path: ./vt
  sections:
    - title: stuck
      files: stuck
`);
  writeProjectFile(root, "vt/templates/default.html", "<!doctype html>\n<html><body>{{ content }}</body></html>\n");
  writeProjectFile(root, "vt/specs/stuck/a-stuck.html", `---
title: stuck
${frontMatter}---
<h1>stuck</h1><input id="inp"><script>${script}</script>
`);
  // The scheduler dispatches the costliest task first (more steps cost more), then source order,
  // so this spec without steps runs after the stuck one's first attempt.
  writeProjectFile(root, "vt/specs/stuck/b-healthy.html", "---\ntitle: healthy\n---\n<h1>healthy</h1>\n");
}

describeE2E("unresponsive pages fail instead of hanging the run", () => {
  let project;

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  for (const [name, [isolation, script, frontMatter, expected]] of Object.entries(scenarios)) {
    it(name, async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      project = createTempProject({ prefix: "rettangoli-vt-e2e-unresponsive-" });
      writeProject(project.root, script, frontMatter);

      const started = Date.now();
      const error = await inProjectDir(project.root, async () => generate({
        port: await availablePort(),
        timeout: 3000,
        concurrency: 1,
        isolation,
      })).then(() => null, (caught) => caught);

      expect(Date.now() - started).toBeLessThan(30000);
      expect(error?.message).toContain("Failed to process 1 screenshot file(s):");
      expect(error?.message).toContain('- stuck/a-stuck.html: Worker 1 failed "stuck/a-stuck.html": ');
      expect(error?.message).toContain(expected);
      const candidate = join(project.root, ".rettangoli", "vt", "_site", "candidate", "stuck");
      expect(existsSync(join(candidate, "b-healthy-01.webp"))).toBe(true);
      const metrics = JSON.parse(readFileSync(join(project.root, ".rettangoli", "vt", "metrics.json"), "utf8"));
      expect(metrics.attempts.map(({ path, outcome }) => `${path} ${outcome}`)).toEqual([
        "stuck/a-stuck.html retry",
        "stuck/b-healthy.html success",
        "stuck/a-stuck.html failure",
      ]);
    }, 45000);
  }
});
