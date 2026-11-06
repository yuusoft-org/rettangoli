import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import generate from "../src/cli/generate.js";
import { readGolden, shouldUpdateGolden, syncGolden } from "./support/record-goldens.mjs";
import { createTempProject, hashTree, inProjectDir, writeProjectFile } from "./support/temp-project.js";

// Freezes the generated VT site: generate({ captureScreenshots: false }) over a fixture project
// with sections and a groupLabel, html/htm/yaml specs (one with a space in its name), front matter
// (title, description, viewport, skipScreenshot, url, unknown keys), a per-spec template, user
// static files overriding library static files, and nested folders. The golden holds a sha256 of
// every file under .rettangoli/vt/_site and the order of the "Generated" log lines.
//
// A second test adds project overrides vt/templates/default.html and vt/templates/index.html to the
// same fixture (golden-overrides.json), so the CLI generate path keeps honoring them.
//
// The hashes include the library templates and static files (src/cli/templates, src/cli/static)
// and the shiki and liquidjs output, so updating any of them legitimately requires re-recording:
//   UPDATE_GOLDEN=1 bunx vitest run spec/site-generate-golden.spec.js

const FIXTURE_DIR = fileURLToPath(new URL("./fixtures/site-golden/project", import.meta.url));
const GOLDEN_PATH = fileURLToPath(new URL("./fixtures/site-golden/golden.json", import.meta.url));
const OVERRIDES_GOLDEN_PATH = fileURLToPath(
  new URL("./fixtures/site-golden/golden-overrides.json", import.meta.url),
);

const DEFAULT_TEMPLATE_OVERRIDE = `<!DOCTYPE html>
<html>
<head><title>{{ frontMatter.title }}</title></head>
<body data-template="project-default">{{ content }}</body>
</html>
`;

const INDEX_TEMPLATE_OVERRIDE = `<!DOCTYPE html>
<html>
<body data-template="project-index">
<h1>{{ currentSection.title }}</h1>
<ul>{% for file in files %}<li id="{{ file.anchorId }}">{{ file.path }}</li>{% endfor %}</ul>
</body>
</html>
`;

describe.sequential("generate({ captureScreenshots: false }) site output", { timeout: 30_000 }, () => {
  let project = null;

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  it("matches the golden file hashes and log order", async () => {
    project = createTempProject({ fixtureDir: FIXTURE_DIR, prefix: "rettangoli-vt-site-golden-" });
    const generatedLines = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      const message = args.join(" ");
      if (message.startsWith("Generated") || message.startsWith("Successfully generated")) {
        generatedLines.push(message);
      }
    });

    await inProjectDir(project.root, () => generate({ captureScreenshots: false }));

    const actual = {
      log: generatedLines,
      files: hashTree(join(project.root, ".rettangoli", "vt", "_site")),
    };
    if (shouldUpdateGolden()) {
      syncGolden(GOLDEN_PATH, actual, { expandDepth: 2, log: () => {} });
      return;
    }
    const golden = readGolden(GOLDEN_PATH);
    expect(actual.log).toEqual(golden.log);
    expect(actual.files).toEqual(golden.files);
  });

  it("uses the project's vt/templates/default.html and vt/templates/index.html overrides", async () => {
    project = createTempProject({ fixtureDir: FIXTURE_DIR, prefix: "rettangoli-vt-site-golden-" });
    writeProjectFile(project.root, "vt/templates/default.html", DEFAULT_TEMPLATE_OVERRIDE);
    writeProjectFile(project.root, "vt/templates/index.html", INDEX_TEMPLATE_OVERRIDE);
    const generatedLines = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      const message = args.join(" ");
      if (message.startsWith("Generated") || message.startsWith("Successfully generated")) {
        generatedLines.push(message);
      }
    });

    await inProjectDir(project.root, () => generate({ captureScreenshots: false }));

    const siteRoot = join(project.root, ".rettangoli", "vt", "_site");
    const read = (file) => readFileSync(join(siteRoot, file), "utf8");
    // default.html applies to every spec without its own template; a per-spec template still wins.
    expect(read("candidate/pages/home.html")).toContain('data-template="project-default"');
    expect(read("candidate/components/basic.html")).toContain('data-template="project-default"');
    expect(read("candidate/forms/inputs/text.html")).not.toContain("project-default");
    expect(read("candidate/forms/inputs/text.html")).toContain("rendered by the per-spec template");
    // index.html renders one overview page per section.
    expect(read("pages.html")).toContain('data-template="project-index"');
    expect(read("pages.html")).toContain("<li id=");
    expect(read("buttons.html")).toContain("<h1>Buttons</h1>");

    const actual = { log: generatedLines, files: hashTree(siteRoot) };
    if (shouldUpdateGolden()) {
      syncGolden(OVERRIDES_GOLDEN_PATH, actual, { expandDepth: 2, log: () => {} });
      return;
    }
    const golden = readGolden(OVERRIDES_GOLDEN_PATH);
    expect(actual.log).toEqual(golden.log);
    expect(actual.files).toEqual(golden.files);
  });

  it("does not leave captured screenshots or metrics behind", async () => {
    project = createTempProject({ fixtureDir: FIXTURE_DIR, prefix: "rettangoli-vt-site-golden-" });
    vi.spyOn(console, "log").mockImplementation(() => {});

    await inProjectDir(project.root, () => generate({ captureScreenshots: false }));

    const files = Object.keys(hashTree(join(project.root, ".rettangoli")));
    expect(files.some((file) => file.endsWith(".webp"))).toBe(false);
    expect(files).not.toContain("vt/metrics.json");
  });
});
