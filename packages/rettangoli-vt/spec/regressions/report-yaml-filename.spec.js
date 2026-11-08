import { afterEach, describe, expect, it, vi } from "vitest";
import report from "../../src/cli/report.js";
import { createTempProject, inProjectDir, writeProjectFile } from "../support/temp-project.js";

// A spec with malformed frontmatter YAML made report() fail with js-yaml's bare message
// ("unexpected end of the stream ... (5:1)"), which does not say which of the specs is broken.

describe.sequential("report names the spec whose frontmatter does not parse", () => {
  let project = null;

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  it("includes forms/form-17.html in the error", async () => {
    project = createTempProject({ prefix: "rettangoli-vt-report-" });
    const { root } = project;
    writeProjectFile(
      root,
      "rettangoli.config.yaml",
      "vt:\n  path: vt\n  sections:\n    - title: Buttons\n      files: buttons\n    - title: Forms\n      files: forms\n",
    );
    for (let index = 1; index <= 30; index += 1) {
      const id = String(index).padStart(2, "0");
      writeProjectFile(root, `vt/specs/buttons/button-${id}.html`, `---\ntitle: button ${id}\n---\n<p>x</p>\n`);
      writeProjectFile(root, `vt/specs/forms/form-${id}.html`, `---\ntitle: form ${id}\n---\n<p>x</p>\n`);
    }
    writeProjectFile(root, "vt/specs/forms/form-17.html", '---\ntitle: broken\nsteps:\n  - [click, "#a"\n---\n<p>x</p>\n');
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(inProjectDir(root, () => report({}))).rejects.toThrow("forms/form-17.html");
  });
});
