import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import report from "../../src/cli/report.js";
import * as selectorFilter from "../../src/selector-filter.js";
import {
  createTempProject,
  inProjectDir,
  recolorLeadingPixels,
  solidPixels,
  writeProjectFile,
  writeWebp,
} from "../support/temp-project.js";

// Report mapped a screenshot back to its spec by stripping any trailing "--suffix" as if it
// were a viewport id. A spec named "btn--primary.html" therefore lost its own frontmatter
// diffThreshold, inherited btn.html's, and `--item components/btn--primary` selected nothing.
// The mapping now prefers real spec keys and only strips a "--suffix" that leads to one.

const RED = [255, 0, 0];
const BLUE = [0, 0, 255];
const reference = solidPixels(2, 2, RED);
const quarterOff = recolorLeadingPixels(reference, 1, BLUE); // 1 of 4 pixels: 25%

async function runReport({ specs, images, options = {} }) {
  const project = createTempProject({ prefix: "rettangoli-vt-double-dash-keys-" });
  try {
    const { root } = project;
    writeProjectFile(root, "rettangoli.config.yaml", [
      "vt:",
      "  path: ./vt",
      "  compareMethod: pixelmatch",
      "  colorThreshold: 0",
      "  sections:",
      "    - title: Components",
      "      files: components",
      "",
    ].join("\n"));
    for (const [relativePath, frontMatter] of Object.entries(specs)) {
      writeProjectFile(
        root,
        `vt/specs/${relativePath}`,
        frontMatter ? `---\n${frontMatter}\n---\n<div>x</div>\n` : "<div>x</div>\n",
      );
    }
    for (const [relativePath, { ref, cand }] of Object.entries(images)) {
      await writeWebp(join(root, "vt/reference", relativePath), { width: 2, height: 2, pixels: ref });
      await writeWebp(join(root, ".rettangoli/vt/_site/candidate", relativePath), {
        width: 2,
        height: 2,
        pixels: cand,
      });
    }
    let threw = null;
    try {
      await inProjectDir(root, () => report(options));
    } catch (error) {
      threw = error.message;
    }
    const json = JSON.parse(readFileSync(join(root, ".rettangoli/vt/report.json"), "utf8"));
    return { threw, total: json.total, mismatched: json.mismatched };
  } finally {
    project.cleanup();
  }
}

describe.sequential("spec names containing '--'", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const quiet = () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  };

  it("B1: btn--primary.html keeps its own frontmatter diffThreshold", async () => {
    quiet();
    const result = await runReport({
      specs: { "components/btn--primary.html": "diffThreshold: 50" },
      images: { "components/btn--primary-01.webp": { ref: reference, cand: quarterOff } },
    });
    expect(result).toEqual({ threw: null, total: 1, mismatched: 0 });
  });

  it("B2: --item components/btn--primary selects that spec's screenshots", async () => {
    quiet();
    const result = await runReport({
      specs: { "components/btn--primary.html": "" },
      images: { "components/btn--primary-01.webp": { ref: reference, cand: quarterOff } },
      options: { item: ["components/btn--primary"] },
    });
    expect(result).toEqual({
      threw: "Error generating VT report: Visual differences found in 1 file(s).",
      total: 1,
      mismatched: 1,
    });
  });

  it("B3: btn.html's diffThreshold does not leak into btn--primary.html", async () => {
    quiet();
    const result = await runReport({
      specs: { "components/btn.html": "diffThreshold: 50", "components/btn--primary.html": "" },
      images: {
        "components/btn-01.webp": { ref: reference, cand: reference },
        "components/btn--primary-01.webp": { ref: reference, cand: quarterOff },
      },
    });
    expect(result).toEqual({
      threw: "Error generating VT report: Visual differences found in 1 file(s).",
      total: 2,
      mismatched: 1,
    });
  });

  it("B4: a--b.html with viewport mobile maps a--b--mobile screenshots to a--b", async () => {
    quiet();
    const result = await runReport({
      specs: { "components/a--b.html": "diffThreshold: 50\nviewport:\n  id: mobile\n  width: 390\n  height: 844" },
      images: { "components/a--b--mobile-01.webp": { ref: reference, cand: quarterOff } },
    });
    expect(result).toEqual({ threw: null, total: 1, mismatched: 0 });
  });
});

describe("toScreenshotItemKey", () => {
  const specKeys = new Set([
    "pages/home",
    "pages/btn",
    "pages/btn--primary",
    "pages/a--b",
    "pages/a",
    "pages/step-2",
  ]);

  it("is exported", () => {
    expect(typeof selectorFilter.toScreenshotItemKey).toBe("function");
  });

  // Names without '--' map exactly as before (strip .webp, the ordinal and a viewport suffix).
  const unchanged = [
    ["pages/home-01.webp", "pages/home"],
    ["pages/home-12.webp", "pages/home"],
    ["pages/home--mobile-01.webp", "pages/home"], // no viewport declared (report-frontmatter-threshold.spec.js)
    ["pages/home--wide_2-03.webp", "pages/home"],
    ["pages/step-2-01.webp", "pages/step-2"],
    ["pages/unknown-01.webp", "pages/unknown"],
    ["pages/unknown--mobile-01.webp", "pages/unknown"],
    ["./pages/home-01.webp", "pages/home"],
    ["pages\\home-01.webp", "pages/home"],
  ];
  for (const [screenshot, key] of unchanged) {
    it(`maps ${screenshot} to ${key}`, () => {
      expect(selectorFilter.toScreenshotItemKey(screenshot, specKeys)).toBe(key);
      expect(selectorFilter.toScreenshotItemKey(screenshot)).toBe(key);
    });
  }

  const doubleDash = [
    ["pages/btn--primary-01.webp", "pages/btn--primary"],
    ["pages/btn--primary--mobile-01.webp", "pages/btn--primary"],
    ["pages/btn-01.webp", "pages/btn"],
    ["pages/a--b--mobile-02.webp", "pages/a--b"],
    ["pages/a--b-01.webp", "pages/a--b"],
  ];
  for (const [screenshot, key] of doubleDash) {
    it(`maps ${screenshot} to the spec key ${key}`, () => {
      expect(selectorFilter.toScreenshotItemKey(screenshot, specKeys)).toBe(key);
    });
  }

  it("filterRelativeScreenshotPathsBySelectors uses the spec keys", () => {
    const paths = ["pages/btn--primary-01.webp", "pages/btn-01.webp", "pages/btn--mobile-01.webp"];
    const select = (item) =>
      selectorFilter.filterRelativeScreenshotPathsBySelectors(
        paths,
        selectorFilter.normalizeSelectors({ item }),
        [],
        specKeys,
      );
    expect(select("pages/btn--primary")).toEqual(["pages/btn--primary-01.webp"]);
    expect(select("pages/btn")).toEqual(["pages/btn-01.webp", "pages/btn--mobile-01.webp"]);
  });
});
