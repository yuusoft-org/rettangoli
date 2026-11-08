import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import generate from "../src/cli/generate.js";
import { generateVtWatchSite } from "../src/cli/watch-plugin.js";
import { generateOverview } from "../src/common.js";
import { createTempProject, inProjectDir, listFiles, writeProjectFile } from "./support/temp-project.js";

// Pins the site build that the CLI (generate) and watch mode share: where overview pages go, what
// happens when the overview template fails, the CLI's "clear candidate, wait 100 ms, copy static"
// and watch's "build in a stage directory, then swap it in".

const CONFIG = "vt:\n  sections:\n    - title: Pages\n      files: pages\n    - title: Forms\n      type: groupLabel\n      items:\n        - title: Inputs\n          files: forms/inputs\n";
const BROKEN_INDEX = "<html>{% for file in files %}{{ file.path }}</html>";
const errorOf = (promise) => promise.then(() => null, (error) => error);

describe.sequential("site build", () => {
  let project = null;
  let site = null;

  beforeEach(() => {
    project = createTempProject({ prefix: "rettangoli-vt-build-site-" });
    site = join(project.root, ".rettangoli", "vt", "_site");
    writeProjectFile(project.root, "rettangoli.config.yaml", CONFIG);
    writeProjectFile(project.root, "vt/specs/pages/home.html", "---\ntitle: Home\n---\n<p>home</p>");
    writeProjectFile(project.root, "vt/specs/forms/inputs/text.yaml", "<p>text</p>");
    writeProjectFile(project.root, "vt/static/public/theme.css", "body{}");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  const cliGenerate = () => inProjectDir(project.root, () => generate({ captureScreenshots: false }));
  const watchGenerate = () => generateVtWatchSite({ cwd: project.root });
  const siteFile = (relativePath) => readFileSync(join(site, relativePath), "utf8");

  describe("overview pages", () => {
    const configData = {
      sections: [
        { title: "Pages", files: "pages" },
        { title: "Forms", type: "groupLabel", items: [{ title: "Inputs", files: "forms/inputs" }] },
      ],
    };
    const files = [{ path: join("pages", "home.html"), frontMatter: { title: "Home" } }];
    const logger = { log: vi.fn(), error: vi.fn() };

    it("writes <page key>.html next to the given index.html path", () => {
      writeProjectFile(project.root, "index.liquid", "{{ currentSection.title }}:{% for file in files %}{{ file.anchorId }}{% endfor %}");
      generateOverview(files, join(project.root, "index.liquid"), join(project.root, "out", "index.html"), configData, { logger });

      expect(listFiles(join(project.root, "out"))).toEqual(["inputs.html", "pages.html"]);
      expect(readFileSync(join(project.root, "out", "pages.html"), "utf8")).toBe("Pages:home");
      expect(logger.log).toHaveBeenCalledWith(`Generated overview: ${join(project.root, "out", "pages.html")}`);
    });

    it("replaces the first \"index.html\" in the whole output path, even in a folder name", () => {
      writeProjectFile(project.root, "index.liquid", "{{ currentSection.title }}");
      const outputDir = join(project.root, "index.html-site");
      for (const key of ["pages", "inputs"]) {
        mkdirSync(join(project.root, `${key}.html-site`));
      }
      generateOverview(files, join(project.root, "index.liquid"), join(outputDir, "index.html"), configData, { logger });

      expect(existsSync(join(outputDir, "pages.html"))).toBe(false);
      expect(readFileSync(join(project.root, "pages.html-site", "index.html"), "utf8")).toBe("Pages");
      expect(readFileSync(join(project.root, "inputs.html-site", "index.html"), "utf8")).toBe("Inputs");
    });
  });

  describe("overview template errors", () => {
    beforeEach(() => {
      writeProjectFile(project.root, "vt/templates/index.html", BROKEN_INDEX);
    });

    it("the CLI writes an error page for each section and logs the error", async () => {
      await cliGenerate();

      const pages = siteFile("pages.html");
      expect(pages).toMatch(/^<html><body><h1>Error rendering overview template<\/h1><p>.+<\/p><\/body><\/html>$/);
      expect(siteFile("inputs.html")).toBe(pages);
      expect(siteFile(join("candidate", "pages", "home.html"))).toContain("<p>home</p>");
      expect(console.error).toHaveBeenCalledWith("Error rendering overview template:", expect.any(Error));
    });

    it("watch throws, naming the section, and keeps the previous site", async () => {
      writeProjectFile(project.root, ".rettangoli/vt/_site/previous.txt", "previous");

      const error = await errorOf(watchGenerate());

      expect(error.message).toMatch(/^Error rendering overview template for "Pages": /);
      expect(error.cause).toBeInstanceOf(Error);
      expect(listFiles(site)).toEqual(["previous.txt"]);
      expect(readdirSync(join(project.root, ".rettangoli", "vt"))).toEqual(["_site"]);
    });
  });

  it("the CLI clears only the candidate folder, waits 100 ms, then copies static files", async () => {
    writeProjectFile(project.root, ".rettangoli/vt/_site/candidate/stale.html", "stale");
    writeProjectFile(project.root, ".rettangoli/vt/_site/candidate/pages/home-01.webp", "old capture");
    writeProjectFile(project.root, ".rettangoli/vt/_site/reference/pages/home-01.webp", "reference");
    writeProjectFile(project.root, ".rettangoli/vt/_site/public/theme.css", "old theme");
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    await cliGenerate();

    expect(setTimeoutSpy.mock.calls.filter(([, delay]) => delay === 100)).toHaveLength(1);
    const files = listFiles(site);
    expect(files).not.toContain("candidate/stale.html");
    expect(files).not.toContain("candidate/pages/home-01.webp");
    expect(siteFile("reference/pages/home-01.webp")).toBe("reference");
    expect(siteFile("public/theme.css")).toBe("body{}");
    expect(files).toEqual(expect.arrayContaining([
      "candidate/forms/inputs/text.html",
      "candidate/pages/home.html",
      "inputs.html",
      "pages.html",
      "public/theme.css",
    ]));
  });

  it("the CLI logs the selector scope between the spec pages and the overview pages", async () => {
    const lines = [];
    vi.mocked(console.log).mockImplementation((line) => lines.push(String(line).split(":")[0]));

    await inProjectDir(project.root, () => generate({ captureScreenshots: false, group: "Inputs" }));

    expect(lines).toEqual([
      "Generated",
      "Generated",
      "Successfully generated 2 files",
      "Selector scope",
      "Generated overview",
      "Generated overview",
    ]);
  });

  it("the CLI writes no overview page when a group selector is unknown", async () => {
    const error = await errorOf(
      inProjectDir(project.root, () => generate({ captureScreenshots: false, group: "Nope" })),
    );

    expect(error.message).toBe("Unknown group selector(s): nope.");
    expect(listFiles(site)).toEqual(expect.arrayContaining(["candidate/pages/home.html"]));
    expect(listFiles(site)).not.toContain("pages.html");
  });

  describe("watch", () => {
    it("builds a stage and swaps it in, keeping only non-HTML candidate files", async () => {
      writeProjectFile(project.root, ".rettangoli/vt/_site/stale.txt", "stale");
      writeProjectFile(project.root, ".rettangoli/vt/_site/candidate/stale.html", "stale");
      writeProjectFile(project.root, ".rettangoli/vt/_site/candidate/pages/home-01.webp", "capture");
      writeProjectFile(project.root, ".rettangoli/vt/_site/reference/pages/home-01.webp", "reference");

      const context = await watchGenerate();

      const files = listFiles(site);
      expect(files).not.toContain("stale.txt");
      expect(files).not.toContain("candidate/stale.html");
      expect(files).not.toContain("reference/pages/home-01.webp");
      expect(siteFile("candidate/pages/home-01.webp")).toBe("capture");
      expect(siteFile("public/theme.css")).toBe("body{}");
      expect(files).toEqual(expect.arrayContaining([
        "candidate/forms/inputs/text.html",
        "candidate/pages/home.html",
        "inputs.html",
        "pages.html",
      ]));
      expect(readdirSync(join(project.root, ".rettangoli", "vt"))).toEqual(["_site"]);
      expect(context.outputDir).toBe(site);
      // Watch logs nothing for generated files.
      expect(vi.mocked(console.log).mock.calls.flat().filter((line) => String(line).startsWith("Generated"))).toEqual([]);
    });

    it("leaves the previous site in place when a spec fails", async () => {
      writeProjectFile(project.root, ".rettangoli/vt/_site/previous.txt", "previous");
      writeProjectFile(project.root, "vt/specs/pages/broken.html", "---\ntitle: [\n---\n<p>x</p>");

      const error = await errorOf(watchGenerate());

      expect(error.message).toMatch(/^Error generating HTML: /);
      expect(listFiles(site)).toEqual(["previous.txt"]);
      expect(readdirSync(join(project.root, ".rettangoli", "vt"))).toEqual(["_site"]);
    });
  });
});

// The shared helpers (src/site/build-site.js; imported lazily so the pins above also run on
// versions without it).
describe("build-site helpers", () => {
  let project = null;

  beforeEach(() => {
    project = createTempProject({ prefix: "rettangoli-vt-build-site-helpers-" });
  });

  afterEach(() => {
    project?.cleanup();
    project = null;
  });

  it("resolveTemplatePaths prefers the project's templates, one by one", async () => {
    const { resolveTemplatePaths } = await import("../src/site/build-site.js");
    const vtPath = join(project.root, "vt");
    const library = join(project.root, "library");

    expect(resolveTemplatePaths(vtPath, library)).toEqual({
      templatesPath: join(vtPath, "templates"),
      defaultTemplatePath: join(library, "default.html"),
      indexTemplatePath: join(library, "index.html"),
    });
    writeProjectFile(project.root, "vt/templates/index.html", "");
    expect(resolveTemplatePaths(vtPath, library)).toMatchObject({
      defaultTemplatePath: join(library, "default.html"),
      indexTemplatePath: join(vtPath, "templates", "index.html"),
    });
  });

  it("copySiteStatic copies library files, then project files over them", async () => {
    const { copySiteStatic } = await import("../src/site/build-site.js");
    writeProjectFile(project.root, "library/public/theme.css", "library");
    writeProjectFile(project.root, "library/public/base.css", "library");
    writeProjectFile(project.root, "user/public/theme.css", "user");
    const target = join(project.root, "site");

    await copySiteStatic(target, {
      libraryStaticPath: join(project.root, "library"),
      userStaticPath: join(project.root, "missing"),
    });
    expect(readFileSync(join(target, "public", "theme.css"), "utf8")).toBe("library");

    await copySiteStatic(target, {
      libraryStaticPath: join(project.root, "library"),
      userStaticPath: join(project.root, "user"),
    });
    expect(listFiles(target)).toEqual(["public/base.css", "public/theme.css"]);
    expect(readFileSync(join(target, "public", "theme.css"), "utf8")).toBe("user");
  });

  it("renderSite renders specs, calls beforeOverview, then renders the overview", async () => {
    const { renderSite } = await import("../src/site/build-site.js");
    writeProjectFile(project.root, "vt/specs/pages/home.html", "<p>home</p>");
    writeProjectFile(project.root, "t/default.html", "[{{ content }}]");
    writeProjectFile(project.root, "t/index.html", "{{ currentSection.title }}");
    const order = [];
    const logger = { log: (line) => order.push(line.split(":")[0]), error: vi.fn() };
    const siteDir = join(project.root, "site");

    const generatedFiles = await renderSite({
      specsPath: join(project.root, "vt", "specs"),
      candidateDir: join(siteDir, "candidate"),
      siteDir,
      templatePaths: {
        defaultTemplatePath: join(project.root, "t", "default.html"),
        indexTemplatePath: join(project.root, "t", "index.html"),
      },
      vtPath: join(project.root, "vt"),
      configData: { sections: [{ title: "Pages", files: "pages" }] },
      logger,
      beforeOverview: (files) => order.push(`before ${files.length}`),
    });

    expect(generatedFiles.map((file) => file.path)).toEqual([join("pages", "home.html")]);
    expect(order).toEqual(["Generated", "Successfully generated 1 files", "before 1", "Generated overview"]);
    expect(readFileSync(join(siteDir, "candidate", "pages", "home.html"), "utf8")).toBe("[<p>home</p>]");
    expect(readFileSync(join(siteDir, "pages.html"), "utf8")).toBe("Pages");
  });
});
