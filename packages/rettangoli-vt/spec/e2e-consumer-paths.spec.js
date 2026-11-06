import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import generate from "../src/cli/generate.js";
import {
  availablePort,
  createTempProject,
  inProjectDir,
  writeProjectFile,
} from "./support/temp-project.js";

// Real-browser checks that the page-evaluation time limits leave the slow but healthy
// patterns consumers use alone: an async takeVtScreenshotBase64 hook (route-engine,
// route-graphics), customEvent with a JSON detail and assert js on an async function (creator),
// and blur on an element that appears late.

const describeE2E = process.env.VT_E2E === "1" ? describe.sequential : describe.skip;

// Resolves after two animation frames with a 40x30 red PNG.
const asyncHook = (format) => `<script>
window.takeVtScreenshotBase64 = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 30;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, 40, 30);
    const dataUrl = canvas.toDataURL("image/png");
    resolve(${format === "raw" ? 'dataUrl.split(",")[1]' : "dataUrl"});
  }));
});
</script>`;

const stepsPage = `---
title: steps
skipInitialScreenshot: true
steps:
  - action: customEvent
    name: vt:detail
    detail:
      count: 2
      nested:
        ok: true
      text: hi
  - action: assert
    type: js
    global: lastDetail
    value:
      count: "2"
      nested: '{"ok":true}'
      text: hi
  - action: assert
    type: js
    fn: waitTwoSeconds
    value: done
  - action: select
    selector: "#late"
    steps:
      - action: focus
      - action: blur
  - action: assert
    type: js
    global: blurred
    value: true
  - action: screenshot
---
<script>
window.addEventListener("vt:detail", (event) => { window.lastDetail = event.detail; });
window.waitTwoSeconds = () => new Promise((resolve) => setTimeout(() => resolve("done"), 2000));
setTimeout(() => {
  const input = document.createElement("input");
  input.id = "late";
  input.addEventListener("blur", () => { window.blurred = true; });
  document.body.appendChild(input);
}, 500);
</script>
`;

function writeProject(root) {
  writeProjectFile(root, "rettangoli.config.yaml", `vt:
  path: ./vt
  sections:
    - title: paths
      files: paths
`);
  writeProjectFile(root, "vt/templates/default.html", "<!doctype html>\n<html><body>{{ content }}</body></html>\n");
  writeProjectFile(root, "vt/specs/paths/hook-data-url.html", `---\ntitle: hook data url\n---\n${asyncHook("dataUrl")}\n`);
  writeProjectFile(root, "vt/specs/paths/hook-raw.html", `---\ntitle: hook raw\n---\n${asyncHook("raw")}\n`);
  writeProjectFile(root, "vt/specs/paths/steps.html", stepsPage);
}

describeE2E("consumer page patterns keep working with time-limited evaluations", () => {
  let project;

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  for (const isolation of ["fast", "strict"]) {
    it(`captures async hooks and runs slow steps (${isolation})`, async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      project = createTempProject({ prefix: "rettangoli-vt-e2e-consumer-" });
      writeProject(project.root);

      await inProjectDir(project.root, async () => generate({
        port: await availablePort(),
        timeout: 5000,
        isolation,
      }));

      const candidate = join(project.root, ".rettangoli", "vt", "_site", "candidate", "paths");
      for (const name of ["hook-data-url-01", "hook-raw-01"]) {
        const { data, info } = await sharp(join(candidate, `${name}.webp`))
          .raw()
          .toBuffer({ resolveWithObject: true });
        expect([info.width, info.height]).toEqual([40, 30]);
        // Lossy WebP: the center pixel is close to pure red.
        const center = (15 * 40 + 20) * info.channels;
        expect(data[center]).toBeGreaterThan(200);
        expect(data[center + 1]).toBeLessThan(40);
        expect(data[center + 2]).toBeLessThan(40);
      }
      // The steps page has no hook, so its screenshot is a regular page capture.
      const steps = await sharp(join(candidate, "steps-01.webp")).metadata();
      expect(steps.width).toBeGreaterThan(0);
    }, 60000);
  }
});
