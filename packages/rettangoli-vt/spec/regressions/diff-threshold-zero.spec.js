import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import report from "../../src/cli/report.js";
import {
  createTempProject,
  inProjectDir,
  recolorLeadingPixels,
  solidPixels,
  writeProjectFile,
  writeWebp,
} from "../support/temp-project.js";

// With diffThreshold 0 (pixel-exact), pixelmatch compared `diffPercent < 0`, which is never
// true, so even byte-identical images were reported as mismatches.

const RED = [255, 0, 0];
const BLUE = [0, 0, 255];
const red = solidPixels(2, 2, RED);

async function runReport({ configLines = [], frontMatter = "", candidatePixels = red, options = {} }) {
  const project = createTempProject({ prefix: "rettangoli-vt-diff-threshold-zero-" });
  try {
    const { root } = project;
    writeProjectFile(root, "rettangoli.config.yaml", [
      "vt:",
      "  path: ./vt",
      "  compareMethod: pixelmatch",
      ...configLines,
      "  sections:",
      "    - title: Pages",
      "      files: pages",
      "",
    ].join("\n"));
    writeProjectFile(
      root,
      "vt/specs/pages/home.html",
      frontMatter ? `---\n${frontMatter}\n---\n<div>home</div>\n` : "<div>home</div>\n",
    );
    await writeWebp(join(root, "vt/reference/pages/home-01.webp"), { width: 2, height: 2, pixels: red });
    await writeWebp(join(root, ".rettangoli/vt/_site/candidate/pages/home-01.webp"), {
      width: 2,
      height: 2,
      pixels: candidatePixels,
    });

    let threw = null;
    try {
      await inProjectDir(root, () => report(options));
    } catch (error) {
      threw = error.message;
    }
    const json = JSON.parse(readFileSync(join(root, ".rettangoli/vt/report.json"), "utf8"));
    return { threw, mismatched: json.mismatched };
  } finally {
    project.cleanup();
  }
}

describe.sequential("diffThreshold 0 passes identical images", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const quiet = () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  };

  const sources = [
    ["the CLI option", { options: { diffThreshold: 0 } }],
    ["vt.diffThreshold in the config", { configLines: ["  diffThreshold: 0"] }],
    ["frontmatter diffThreshold", { frontMatter: "diffThreshold: 0" }],
  ];

  for (const [name, setup] of sources) {
    it(`passes identical images when the threshold 0 comes from ${name}`, async () => {
      quiet();
      await expect(runReport(setup)).resolves.toEqual({ threw: null, mismatched: 0 });
    });
  }

  it("still fails a 1-pixel difference at threshold 0", async () => {
    quiet();
    const result = await runReport({
      options: { diffThreshold: 0 },
      candidatePixels: recolorLeadingPixels(red, 1, BLUE),
    });
    expect(result).toEqual({
      threw: "Error generating VT report: Visual differences found in 1 file(s).",
      mismatched: 1,
    });
  });

  it("still fails a 25% difference at threshold 0.3", async () => {
    quiet();
    const result = await runReport({
      options: { diffThreshold: 0.3 },
      candidatePixels: recolorLeadingPixels(red, 1, BLUE),
    });
    expect(result.mismatched).toBe(1);
  });
});
