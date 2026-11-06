import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createCaptureTasks } from "../../src/capture/spec-loader.js";
import { generateHtml } from "../../src/common.js";

// Two specs that generate the same page (a.html + a.yaml, a.htm + a.html) silently
// overwrote each other's candidate page, and a spec named like another spec's viewport
// screenshot (btn--mobile.html next to btn.html with viewport "mobile") overwrote its
// screenshots. Both now fail and name the two sources.

describe("output collisions", () => {
  let rootDir = null;

  afterEach(() => {
    if (rootDir) rmSync(rootDir, { recursive: true, force: true });
    rootDir = null;
  });

  async function generate(names) {
    rootDir = mkdtempSync(join(tmpdir(), "rettangoli-vt-output-collisions-"));
    const specsDir = join(rootDir, "specs");
    const templatePath = join(rootDir, "template.html");
    writeFileSync(templatePath, "<html>{{ content }}</html>");
    for (const name of names) {
      const filePath = join(specsDir, name);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, "<div>spec</div>\n");
    }
    return generateHtml(specsDir, templatePath, join(rootDir, "out"), {
      defaultTemplate: templatePath,
      vtPath: rootDir,
      logger: { log() {} },
    });
  }

  it("a.html and a.yaml both generating a.html throws, naming both", async () => {
    await expect(generate(["forms/a.html", "forms/a.yaml"])).rejects.toThrow(
      'Spec output collision: "forms/a.html" and "forms/a.yaml" both generate "forms/a.html".',
    );
  });

  it("a.htm and a.html throws", async () => {
    await expect(generate(["a.htm", "a.html"])).rejects.toThrow(
      'Spec output collision: "a.htm" and "a.html" both generate "a.html".',
    );
  });

  it("distinct outputs still generate", async () => {
    const files = await generate(["a.html", "b.yaml", "c/a.html"]);
    expect(files.map((file) => file.path)).toEqual(["a.html", "b.yaml", "c/a.html"]);
  });

  it("btn--mobile.html next to btn.html with viewport mobile throws at createCaptureTasks", () => {
    const files = [
      { path: "pages/btn.html", frontMatter: { viewport: [{ id: "mobile", width: 390, height: 844 }] } },
      { path: "pages/btn--mobile.html", frontMatter: {} },
    ];
    expect(() => createCaptureTasks(files, { serverUrl: "http://localhost:3001" })).toThrow(
      'Screenshot name collision: "pages/btn.html" and "pages/btn--mobile.html" both produce "pages/btn--mobile-NN.webp".',
    );
  });

  it("the same spec at several viewports is not a collision", () => {
    const files = [
      {
        path: "pages/btn.html",
        frontMatter: { viewport: [{ id: "mobile", width: 390, height: 844 }, { id: "wide", width: 1600, height: 900 }] },
      },
      { path: "pages/btn--primary.html", frontMatter: {} },
    ];
    const tasks = createCaptureTasks(files, { serverUrl: "http://localhost:3001" });
    expect(tasks.map((task) => task.baseName)).toEqual([
      "pages/btn--mobile",
      "pages/btn--wide",
      "pages/btn--primary",
    ]);
  });
});
