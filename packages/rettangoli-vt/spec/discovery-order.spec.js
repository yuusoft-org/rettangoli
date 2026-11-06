import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateHtml, getAllFiles } from "../src/common.js";

// Spec files are discovered in byte order (libuv's readdir order under node; VT sorts siblings
// itself, so Bun, whose readdir is unsorted, gives the same order). Overview pages, generation
// logs and report.json follow that order. Output ordering is part of the contract, whatever
// walker implements it.

const NAMES = ["b.html", "A.html", "_z.html", "a-b.html", "é.html", "10.html", "9.html"];
const NESTED = "a/inner.html";

// UTF-8 byte order: digits, uppercase, underscore, lowercase ("a" before "a-b"), then non-ASCII.
const BYTE_ORDER = [
  "10.html",
  "9.html",
  "A.html",
  "_z.html",
  "a/inner.html",
  "a-b.html",
  "b.html",
  "é.html",
];

describe("spec discovery order", { timeout: 30_000 }, () => {
  let rootDir = null;

  afterEach(() => {
    if (rootDir) {
      rmSync(rootDir, { recursive: true, force: true });
    }
    rootDir = null;
    vi.restoreAllMocks();
  });

  function createSpecsDir() {
    rootDir = mkdtempSync(join(tmpdir(), "rettangoli-vt-order-"));
    const specsDir = join(rootDir, "specs");
    mkdirSync(join(specsDir, "a"), { recursive: true });
    // Created in a deliberately unsorted order.
    for (const name of [...NAMES, NESTED]) {
      writeFileSync(join(specsDir, name), "<div>spec</div>\n", "utf8");
    }
    return specsDir;
  }

  it("walks directories depth-first in byte order", () => {
    const specsDir = createSpecsDir();
    const files = getAllFiles(specsDir).map((file) => relative(specsDir, file));
    expect(files).toEqual(BYTE_ORDER);
  });

  it("generates pages and logs them in the same order", async () => {
    const specsDir = createSpecsDir();
    const templatePath = join(rootDir, "template.html");
    writeFileSync(templatePath, "<html>{{ content }}</html>", "utf8");
    const logger = { log: vi.fn() };

    const files = await generateHtml(specsDir, templatePath, join(rootDir, "out"), {
      defaultTemplate: templatePath,
      vtPath: rootDir,
      logger,
    });

    expect(files.map((file) => file.path)).toEqual(BYTE_ORDER);
    const generated = logger.log.mock.calls
      .map(([message]) => message)
      .filter((message) => message.startsWith("Generated: "))
      .map((message) => relative(join(rootDir, "out"), message.slice("Generated: ".length)));
    expect(generated).toEqual(BYTE_ORDER);
  });
});
