import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import generate from "../../src/cli/generate.js";
import { createTempProject, inProjectDir, writeProjectFile } from "../support/temp-project.js";

// Generate reported a malformed frontmatter block or a broken Liquid template with the
// parser's bare message, so with dozens of specs nobody could tell which file to fix.
// Errors now name the spec (and, for template errors, the template).

const CONFIG = "vt:\n  path: vt\n  sections:\n    - title: Buttons\n      files: buttons\n    - title: Forms\n      files: forms\n";

describe.sequential("generate errors name the spec and the template", () => {
  let project = null;

  beforeEach(() => {
    project = createTempProject({ prefix: "rettangoli-vt-generate-" });
    writeProjectFile(project.root, "rettangoli.config.yaml", CONFIG);
    for (let index = 1; index <= 30; index += 1) {
      const id = String(index).padStart(2, "0");
      writeProjectFile(project.root, `vt/specs/buttons/button-${id}.html`, `---\ntitle: button ${id}\n---\n<p>x</p>\n`);
      writeProjectFile(project.root, `vt/specs/forms/form-${id}.html`, `---\ntitle: form ${id}\n---\n<p>x</p>\n`);
    }
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  const run = () => inProjectDir(project.root, () => generate({ captureScreenshots: false }));

  it("names forms/form-17.html when its frontmatter does not parse", async () => {
    writeProjectFile(project.root, "vt/specs/forms/form-17.html", '---\ntitle: broken\nsteps:\n  - [click, "#a"\n---\n<p>x</p>\n');
    const error = await run().then(() => null, (caught) => caught);
    expect(error?.message).toMatch(/^Error generating HTML: /);
    expect(error.message).toContain("forms/form-17.html");
  });

  it("names the template and the spec when a per-spec template does not parse", async () => {
    writeProjectFile(project.root, "vt/templates/broken.html", "<html>{% if content %}{{ content }}</html>\n");
    writeProjectFile(project.root, "vt/specs/forms/form-17.html", "---\ntemplate: broken.html\n---\n<p>x</p>\n");
    const error = await run().then(() => null, (caught) => caught);
    expect(error?.message).toMatch(/^Error generating HTML: Failed to render template "[^"]*broken\.html" for "forms\/form-17\.html": /);
    expect(error.cause?.cause).toBeInstanceOf(Error);
  });
});
