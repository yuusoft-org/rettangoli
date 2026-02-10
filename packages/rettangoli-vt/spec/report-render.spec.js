import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHtmlReport } from "../src/report/report-render.js";

function createTempDir() {
  return mkdtempSync(join(tmpdir(), "rettangoli-vt-report-render-"));
}

describe("renderHtmlReport", () => {
  let tempDir = null;

  afterEach(() => {
    vi.restoreAllMocks();
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    tempDir = null;
  });

  it("renders template to output path", async () => {
    tempDir = createTempDir();
    const templatePath = join(tempDir, "report.html.liquid");
    const outputPath = join(tempDir, "report.html");

    writeFileSync(
      templatePath,
      "<ul>{% for file in files %}<li>{{ file.candidatePath }}</li>{% endfor %}</ul>",
      "utf8",
    );

    vi.spyOn(console, "log").mockImplementation(() => {});

    await renderHtmlReport({
      results: [
        { candidatePath: "candidate/button-01.webp" },
        { candidatePath: "candidate/button-02.webp" },
      ],
      templatePath,
      outputPath,
    });

    const html = readFileSync(outputPath, "utf8");
    expect(html).toContain("candidate/button-01.webp");
    expect(html).toContain("candidate/button-02.webp");
  });

  it("wraps render errors with a clear message", async () => {
    tempDir = createTempDir();
    const outputPath = join(tempDir, "report.html");
    const templatePath = join(tempDir, "missing-template.html");

    await expect(
      renderHtmlReport({
        results: [],
        templatePath,
        outputPath,
      }),
    ).rejects.toThrow("Failed to generate HTML report");
  });
});
