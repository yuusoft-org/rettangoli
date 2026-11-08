import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import accept from "../src/cli/accept.js";
import report from "../src/cli/report.js";
import { readGolden, shouldUpdateGolden, syncGolden } from "./support/record-goldens.mjs";
import {
  createTempProject,
  inProjectDir,
  listFiles,
  recolorLeadingPixels,
  sha256,
  solidPixels,
  writeProjectFile,
  writeWebp,
} from "./support/temp-project.js";

// Freezes report() and accept() on synthetic lossless WebP images: identical, a 1-pixel
// difference, a 10% difference, a size mismatch, only-in-candidate, only-in-reference,
// viewport suffixes and ordinals, and frontmatter diffThreshold overrides. Each scenario records
// report.json (without its timestamp), whether report() threw, the _site listings, and, after a
// failing report, which files accept() copied or removed.
//
// Re-record after an intentional change: UPDATE_GOLDEN=1 bunx vitest run spec/report-golden.spec.js

const GOLDEN_PATH = fileURLToPath(new URL("./fixtures/report/golden.json", import.meta.url));

const SIZE = 40;
const RED = [255, 0, 0];
const BLUE = [0, 0, 255];
const image = (pixels, height = SIZE) => ({ width: SIZE, height, pixels });

const red = solidPixels(SIZE, SIZE, RED);
const onePixelOff = recolorLeadingPixels(red, 1, BLUE);
const tenPercentOff = recolorLeadingPixels(red, (SIZE * SIZE) / 10, BLUE);

const SPECS = {
  "pages/responsive.html": "---\ndiffThreshold: 15\n---\n<main>responsive</main>\n",
  "pages/tolerant.html": "---\ndiffThreshold: 20\n---\n<main>tolerant</main>\n",
  "pages/identical.html": "<main>identical</main>\n",
};

const REFERENCE = {
  "pages/identical-01.webp": image(red),
  "pages/onepixel-01.webp": image(red),
  "pages/tenpercent-01.webp": image(red),
  "pages/resized-01.webp": image(red),
  "pages/gone-01.webp": image(red),
  "pages/responsive--mobile-01.webp": image(red),
  "pages/responsive--wide-01.webp": image(red),
  "pages/tolerant-01.webp": image(red),
  "pages/multi-01.webp": image(red),
  "pages/multi-02.webp": image(red),
  "forms/field-01.webp": image(red),
};

const CANDIDATE = {
  "pages/identical-01.webp": image(red),
  "pages/onepixel-01.webp": image(onePixelOff),
  "pages/tenpercent-01.webp": image(tenPercentOff),
  "pages/resized-01.webp": image(solidPixels(SIZE, SIZE + 10, RED), SIZE + 10),
  "pages/new-01.webp": image(red),
  "pages/responsive--mobile-01.webp": image(red),
  "pages/responsive--wide-01.webp": image(tenPercentOff),
  "pages/tolerant-01.webp": image(tenPercentOff),
  "pages/multi-01.webp": image(red),
  "pages/multi-02.webp": image(onePixelOff),
  "forms/field-01.webp": image(tenPercentOff),
};

const ALL_IDENTICAL = {
  reference: { "pages/identical-01.webp": image(red), "pages/other-01.webp": image(red) },
  candidate: { "pages/identical-01.webp": image(red), "pages/other-01.webp": image(red) },
};

const SCENARIOS = [
  { id: "md5", options: { compareMethod: "md5" } },
  { id: "pixelmatch-defaults", options: {} },
  { id: "pixelmatch-strict-diff-threshold", options: { diffThreshold: 0.01 } },
  { id: "pixelmatch-loose-diff-threshold", options: { diffThreshold: 50 } },
  // 160 of 1600 pixels differ: exactly 10%, so a threshold of 10 sits on the boundary.
  { id: "pixelmatch-boundary-diff-threshold", options: { diffThreshold: 10 } },
  { id: "pixelmatch-color-threshold-1", options: { colorThreshold: 1 } },
  { id: "selector-folder", options: { folder: "pages" } },
  { id: "selector-item-matches-all-ordinals", options: { item: "pages/multi" } },
  { id: "selector-item-matches-viewport-suffixes", options: { item: "pages/responsive" } },
  { id: "selector-group", options: { group: "pages" } },
  { id: "md5-all-identical", options: { compareMethod: "md5" }, ...ALL_IDENTICAL },
  { id: "pixelmatch-all-identical", options: {}, ...ALL_IDENTICAL },
  { id: "no-reference-directory", reference: null, candidate: { "pages/new-01.webp": image(red) } },
  { id: "no-candidate-directory", candidate: null },
];

async function writeImages(root, directory, images) {
  for (const [relativePath, data] of Object.entries(images)) {
    await writeWebp(join(root, directory, relativePath), data);
  }
}

// Which known version of each file ended up in `directory`: "same" (candidate and reference are
// byte-identical), "candidate", "reference" or "other".
function classifyFiles(root, directory, originals) {
  const result = {};
  for (const file of listFiles(join(root, directory))) {
    const content = sha256(readFileSync(join(root, directory, file)));
    const isCandidate = originals.candidate.get(file) === content;
    const isReference = originals.reference.get(file) === content;
    result[file] = isCandidate && isReference ? "same" : isCandidate ? "candidate" : isReference ? "reference" : "other";
  }
  return result;
}

function snapshotHashes(root, directory) {
  const hashes = new Map();
  for (const file of listFiles(join(root, directory))) {
    hashes.set(file, sha256(readFileSync(join(root, directory, file))));
  }
  return hashes;
}

async function runScenario(scenario) {
  const project = createTempProject({ prefix: "rettangoli-vt-report-golden-" });
  try {
    const { root } = project;
    writeProjectFile(
      root,
      "rettangoli.config.yaml",
      "vt:\n  path: ./vt\n  sections:\n    - title: Pages\n      files: pages\n    - title: Forms\n      files: forms\n",
    );
    for (const [relativePath, content] of Object.entries(scenario.specs ?? SPECS)) {
      writeProjectFile(root, `vt/specs/${relativePath}`, content);
    }
    const referenceImages = scenario.reference === undefined ? REFERENCE : scenario.reference;
    const candidateImages = scenario.candidate === undefined ? CANDIDATE : scenario.candidate;
    if (referenceImages) {
      await writeImages(root, "vt/reference", referenceImages);
    }
    if (candidateImages) {
      await writeImages(root, ".rettangoli/vt/_site/candidate", candidateImages);
    }
    const originals = {
      candidate: snapshotHashes(root, ".rettangoli/vt/_site/candidate"),
      reference: snapshotHashes(root, "vt/reference"),
    };

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    let threw = null;
    try {
      await inProjectDir(root, () => report(scenario.options ?? {}));
    } catch (error) {
      threw = error.message;
    }

    const reportPath = join(root, ".rettangoli", "vt", "report.json");
    const jsonReport = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;
    if (jsonReport) {
      expect(typeof jsonReport.timestamp).toBe("string");
      delete jsonReport.timestamp;
    }
    const siteListing = (directory) => listFiles(join(root, ".rettangoli", "vt", "_site", directory));
    const result = {
      threw,
      report: jsonReport,
      diffImages: siteListing("diff"),
      siteReference: siteListing("reference"),
      htmlReport: existsSync(join(root, ".rettangoli", "vt", "_site", "report.html")),
    };

    if (jsonReport?.items.length > 0) {
      await inProjectDir(root, () => accept({}));
      result.referenceAfterAccept = classifyFiles(root, "vt/reference", originals);
      result.removedByAccept = [...originals.reference.keys()].filter(
        (file) => !existsSync(join(root, "vt/reference", file)),
      );
    }
    return JSON.parse(JSON.stringify(result));
  } finally {
    project.cleanup();
  }
}

describe.sequential("report() and accept()", { timeout: 30_000 }, () => {
  const golden = readGolden(GOLDEN_PATH) ?? {};
  const recorded = {};

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    if (shouldUpdateGolden()) {
      syncGolden(GOLDEN_PATH, recorded, { expandDepth: 1 });
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
