import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// Discovery used fs.readdirSync's order. libuv (node) sorts entries by byte value, Bun
// does not, so under Bun (the Docker image's runtime) generation logs, overview pages and capture
// task order followed the file system. Discovery now sorts siblings itself.
// readdirSync is replaced with one that returns entries in reverse byte order, which is what an
// unsorted runtime may do.

const reverseReaddir = vi.hoisted(() => ({ enabled: false }));

async function mockFs(importOriginal) {
  const actual = await importOriginal();
  const readdirSync = (...args) => {
    const entries = actual.readdirSync(...args);
    return reverseReaddir.enabled ? [...entries].reverse() : entries;
  };
  return { ...actual, readdirSync, default: { ...actual, readdirSync } };
}
vi.mock("fs", mockFs);
vi.mock("node:fs", mockFs);

const { generateHtml } = await import("../../src/common.js");

const NAMES = ["b.html", "A.html", "_z.html", "a-b.html", "é.html", "10.html", "9.html", "a/inner.html"];
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

describe("discovery is byte-sorted whatever readdirSync returns", () => {
  let rootDir = null;

  afterEach(() => {
    reverseReaddir.enabled = false;
    if (rootDir) rmSync(rootDir, { recursive: true, force: true });
    rootDir = null;
  });

  function createSpecsDir() {
    rootDir = mkdtempSync(join(tmpdir(), "rettangoli-vt-sorted-discovery-"));
    const specsDir = join(rootDir, "specs");
    mkdirSync(join(specsDir, "a"), { recursive: true });
    for (const name of NAMES) writeFileSync(join(specsDir, name), "<div>spec</div>\n");
    return specsDir;
  }

  it("listFilesSorted walks depth-first in byte order", async () => {
    const { listFilesSorted } = await import("../../src/spec-files.js");
    const specsDir = createSpecsDir();
    reverseReaddir.enabled = true;
    expect(listFilesSorted(specsDir).map((file) => relative(specsDir, file))).toEqual(BYTE_ORDER);
  });

  it("generateHtml generates and logs specs in byte order", async () => {
    const specsDir = createSpecsDir();
    const templatePath = join(rootDir, "template.html");
    writeFileSync(templatePath, "<html>{{ content }}</html>");
    const outputDir = join(rootDir, "out");
    const logger = { log: vi.fn() };
    reverseReaddir.enabled = true;

    const files = await generateHtml(specsDir, templatePath, outputDir, {
      defaultTemplate: templatePath,
      vtPath: rootDir,
      logger,
    });

    expect(files.map((file) => file.path)).toEqual(BYTE_ORDER);
    const generated = logger.log.mock.calls
      .map(([message]) => message)
      .filter((message) => message.startsWith("Generated: "))
      .map((message) => relative(outputDir, message.slice("Generated: ".length)));
    expect(generated).toEqual(BYTE_ORDER);
  });
});
