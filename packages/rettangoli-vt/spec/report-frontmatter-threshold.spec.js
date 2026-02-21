import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import report from "../src/cli/report.js";

function createTempDir() {
  return mkdtempSync(join(tmpdir(), "rettangoli-vt-report-frontmatter-threshold-"));
}

async function writeWebp(filePath, pixels) {
  mkdirSync(dirname(filePath), { recursive: true });
  await sharp(Buffer.from(pixels), { raw: { width: 2, height: 2, channels: 4 } })
    .webp({ lossless: true })
    .toFile(filePath);
}

function writeProjectFiles(rootDir, frontMatterBlock) {
  const configYaml = [
    "vt:",
    "  path: ./vt",
    "  compareMethod: pixelmatch",
    "  colorThreshold: 0",
    "  diffThreshold: 0.1",
    "  sections:",
    "    - title: Pages",
    "      files: pages",
    "",
  ].join("\n");
  writeFileSync(join(rootDir, "rettangoli.config.yaml"), configYaml, "utf8");

  const specPath = join(rootDir, "vt", "specs", "pages", "home.html");
  mkdirSync(dirname(specPath), { recursive: true });
  const specContent = frontMatterBlock
    ? `---\n${frontMatterBlock}\n---\n<div data-testid="app">home</div>\n`
    : "<div data-testid=\"app\">home</div>\n";
  writeFileSync(specPath, specContent, "utf8");
}

describe.sequential("report frontmatter diffThreshold overrides", () => {
  const originalCwd = process.cwd();
  let tempDir = null;

  afterEach(() => {
    vi.restoreAllMocks();
    process.chdir(originalCwd);
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    tempDir = null;
  });

  it("uses frontmatter diffThreshold for viewport screenshot paths", async () => {
    tempDir = createTempDir();
    process.chdir(tempDir);
    writeProjectFiles(tempDir, "diffThreshold: 30");

    const referencePixels = [
      255, 0, 0, 255, 255, 0, 0, 255,
      255, 0, 0, 255, 255, 0, 0, 255,
    ];
    const candidatePixels = [
      0, 0, 255, 255, 255, 0, 0, 255,
      255, 0, 0, 255, 255, 0, 0, 255,
    ];

    await writeWebp(
      join(tempDir, "vt", "reference", "pages", "home--mobile-01.webp"),
      referencePixels,
    );
    await writeWebp(
      join(tempDir, ".rettangoli", "vt", "_site", "candidate", "pages", "home--mobile-01.webp"),
      candidatePixels,
    );

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(report()).resolves.toBeUndefined();
    const jsonReport = JSON.parse(readFileSync(join(tempDir, ".rettangoli", "vt", "report.json"), "utf8"));
    expect(jsonReport.mismatched).toBe(0);
    expect(jsonReport.items).toHaveLength(0);
  });

  it("uses global diffThreshold when frontmatter override is absent", async () => {
    tempDir = createTempDir();
    process.chdir(tempDir);
    writeProjectFiles(tempDir, "");

    const referencePixels = [
      255, 0, 0, 255, 255, 0, 0, 255,
      255, 0, 0, 255, 255, 0, 0, 255,
    ];
    const candidatePixels = [
      0, 0, 255, 255, 255, 0, 0, 255,
      255, 0, 0, 255, 255, 0, 0, 255,
    ];

    await writeWebp(
      join(tempDir, "vt", "reference", "pages", "home--mobile-01.webp"),
      referencePixels,
    );
    await writeWebp(
      join(tempDir, ".rettangoli", "vt", "_site", "candidate", "pages", "home--mobile-01.webp"),
      candidatePixels,
    );

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(report()).rejects.toThrow("Visual differences found in 1 file(s).");
  });
});
