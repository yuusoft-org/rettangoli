import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";
import { describe, expect, it } from "vitest";
import { compileStep } from "../src/createSteps.js";
import { validateFrontMatter, validateVtConfig } from "../src/validation.js";

// The examples in README.md and docs/*.md must stay valid. Every fenced yaml block, and
// every html block that starts with frontmatter, is checked:
// - a block that starts with "---" is a spec file: its frontmatter must pass validateFrontMatter;
// - a yaml block with a top-level `vt` key is a config (or a fragment of one): `vt` must pass
//   validateVtConfig, with a placeholder `sections` when the fragment has none;
// - a yaml block with a top-level `steps` key is a frontmatter fragment: validateFrontMatter.
// Each step must also compile with the runtime grammar (compileStep).
// A block that is not a VT example, or that shows an invalid one on purpose, follows a
// `<!-- docs-examples: skip -->` line. Any other yaml block fails, so no example goes unchecked.

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const SKIP_MARKER = "<!-- docs-examples: skip -->";
const PLACEHOLDER_SECTIONS = [{ title: "Example", files: "example" }];

function docFiles() {
  const docs = readdirSync(`${packageRoot}docs`)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => `docs/${name}`);
  return ["README.md", ...docs];
}

// Fenced blocks as { file, line, lang, body, skipped }.
function extractBlocks(file) {
  const lines = readFileSync(`${packageRoot}${file}`, "utf8").split("\n");
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const open = lines[index].match(/^```(\S*)\s*$/);
    if (!open) continue;
    const start = index;
    const body = [];
    for (index += 1; index < lines.length && lines[index] !== "```"; index += 1) {
      body.push(lines[index]);
    }
    const previous = lines.slice(0, start).reverse().find((line) => line.trim() !== "");
    blocks.push({
      file,
      line: start + 1,
      lang: open[1],
      body: body.join("\n"),
      skipped: previous?.trim() === SKIP_MARKER,
    });
  }
  return blocks;
}

function checkSteps(steps) {
  (steps ?? []).forEach((step) => compileStep(structuredClone(step)));
}

// Returns what the block was checked as; throws when it is invalid.
function checkBlock({ lang, body }) {
  const frontMatter = body.match(/^---\n([\s\S]*?)\n---(\n|$)/);
  if (frontMatter) {
    const data = loadYaml(frontMatter[1]);
    validateFrontMatter(data, "example");
    checkSteps(data?.steps);
    return "spec file";
  }
  if (lang !== "yaml") {
    return null;
  }
  const data = loadYaml(body);
  if (data?.vt !== undefined) {
    validateVtConfig({ sections: PLACEHOLDER_SECTIONS, ...data.vt });
    return "config";
  }
  if (data?.steps !== undefined) {
    validateFrontMatter(data, "example");
    checkSteps(data.steps);
    return "frontmatter";
  }
  throw new Error("yaml block is not a VT config, frontmatter or spec file; add the skip marker if that is intended");
}

describe("docs examples", () => {
  const examples = docFiles()
    .flatMap(extractBlocks)
    .filter((block) => !block.skipped && (block.lang === "yaml" || block.body.startsWith("---\n")));

  it("finds the examples", () => {
    expect(examples.length).toBeGreaterThanOrEqual(10);
  });

  for (const block of examples) {
    it(`${block.file}:${block.line} is valid`, () => {
      expect(() => checkBlock(block)).not.toThrow();
    });
  }

  it("rejects an invalid example, so the check is not a no-op", () => {
    expect(() => checkBlock({ lang: "yaml", body: "steps:\n  - action: click\n    selector: '#a'" })).toThrow();
    expect(() => checkBlock({ lang: "yaml", body: "vt:\n  port: abc" })).toThrow();
    expect(() => checkBlock({ lang: "html", body: "---\nwaitStrategy: soon\n---\n<p></p>" })).toThrow();
    expect(() => checkBlock({ lang: "yaml", body: "other: 1" })).toThrow();
  });
});
