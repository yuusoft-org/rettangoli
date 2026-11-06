import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { codeToHtml } from "shiki";
import { generateHtml } from "../src/common.js";
import { createCaptureTasks } from "../src/capture/spec-loader.js";
import { createTempProject, inProjectDir, writeProjectFile } from "./support/temp-project.js";

// Pins how generateHtml derives a spec's page path, highlight language and processedFiles entry,
// and how capture tasks derive the candidate page URL, before the shared path helpers move.

const shiki = (content, lang) => codeToHtml(content, { lang, theme: "slack-dark" });

describe.sequential("generateHtml spec paths and processedFiles", () => {
  let project = null;

  beforeEach(() => {
    project = createTempProject({ prefix: "rettangoli-vt-spec-paths-" });
    writeProjectFile(project.root, "vt/templates/default.html", "<main>{{ content }}</main>");
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  const run = () => {
    const vtPath = join(project.root, "vt");
    const templatePath = join(vtPath, "templates", "default.html");
    return generateHtml(join(vtPath, "specs"), templatePath, join(project.root, "out"), {
      defaultTemplate: templatePath,
      vtPath,
      logger: { log() {} },
    });
  };

  it("returns one entry per spec with the same keys and values", async () => {
    const fullContent = "---\ntitle: Basic\nviewport: { id: d, width: 10, height: 20 }\n---\n<p>hi</p>\n";
    writeProjectFile(project.root, "vt/specs/a/basic.html", fullContent);

    const [entry, ...rest] = await run();

    expect(rest).toEqual([]);
    expect(Object.keys(entry)).toEqual([
      "path",
      "content",
      "contentShiki",
      "frontMatter",
      "fullContent",
      "renderedContent",
    ]);
    expect(entry).toEqual({
      path: join("a", "basic.html"),
      content: "<p>hi</p>",
      contentShiki: await shiki("<p>hi</p>", "html"),
      frontMatter: { title: "Basic", viewport: { id: "d", width: 10, height: 20 } },
      fullContent,
      renderedContent: "<main><p>hi</p></main>",
    });
  });

  it("uses null front matter when a spec has none", async () => {
    writeProjectFile(project.root, "vt/specs/plain.html", "<p>x</p>");
    const [entry] = await run();
    expect(entry.frontMatter).toBeNull();
  });

  it("highlights .yaml as yaml but .yml (and .htm) as html, because the language test is includes('.yaml')", async () => {
    const yaml = "key: value\nlist:\n  - one";
    writeProjectFile(project.root, "vt/specs/a.yaml", yaml);
    writeProjectFile(project.root, "vt/specs/b.yml", yaml);
    writeProjectFile(project.root, "vt/specs/c.htm", yaml);
    // The test looks at the whole path, so an html spec under a "x.yaml" folder counts as yaml.
    writeProjectFile(project.root, "vt/specs/x.yaml/d.html", yaml);

    const byPath = Object.fromEntries((await run()).map((file) => [file.path, file.contentShiki]));

    const asYaml = await shiki(yaml, "yaml");
    const asHtml = await shiki(yaml, "html");
    expect(asYaml).not.toBe(asHtml);
    expect(byPath).toEqual({
      "a.yaml": asYaml,
      "b.yml": asHtml,
      "c.htm": asHtml,
      [join("x.yaml", "d.html")]: asYaml,
    });
  });

  it("writes each spec to <path without extension>.html, keeping .html names", async () => {
    for (const name of ["one.html", "two.htm", "three.yaml", "four.yml", "five.v2.html", "dir.v1/six", "seven."]) {
      writeProjectFile(project.root, `vt/specs/${name}`, "<p>x</p>");
    }
    const logged = [];
    vi.mocked(console.log).mockImplementation((message) => logged.push(message));
    const vtPath = join(project.root, "vt");
    const templatePath = join(vtPath, "templates", "default.html");
    await inProjectDir(project.root, () =>
      generateHtml(join(vtPath, "specs"), templatePath, "out", { defaultTemplate: templatePath, vtPath }));

    expect(logged.filter((line) => line.startsWith("Generated: "))).toEqual([
      `Generated: ${join("out", "dir.v1", "six.html")}`,
      `Generated: ${join("out", "five.v2.html")}`,
      `Generated: ${join("out", "four.html")}`,
      `Generated: ${join("out", "one.html")}`,
      `Generated: ${join("out", "seven..html")}`,
      `Generated: ${join("out", "three.html")}`,
      `Generated: ${join("out", "two.html")}`,
    ]);
  });
});

describe("capture task candidate URLs", () => {
  const urlFor = (path) =>
    createCaptureTasks([{ path, frontMatter: {} }], { serverUrl: "http://localhost:3001" })[0].url;

  it("points at /candidate/<path>.html (escaping is pinned by regressions/encoded-paths.spec.js)", () => {
    expect(urlFor("a/basic.html")).toBe("http://localhost:3001/candidate/a/basic.html");
    expect(urlFor("a\\b\\c.yaml")).toBe("http://localhost:3001/candidate/a/b/c.html");
    expect(urlFor("five.v2.yml")).toBe("http://localhost:3001/candidate/five.v2.html");
    expect(urlFor("dir.v1/six")).toBe("http://localhost:3001/candidate/dir.v1/six.html");
    expect(urlFor("seven.")).toBe("http://localhost:3001/candidate/seven..html");
    expect(urlFor("x.h%tml")).toBe("http://localhost:3001/candidate/x.html");
    expect(urlFor("spaced name.html")).toBe("http://localhost:3001/candidate/spaced name.html");
  });
});

describe("shared path helpers", () => {
  it("removeExtension drops only the file name's last extension", async () => {
    const { removeExtension } = await import("../src/spec-files.js");
    expect(["a/b.yaml", "a/b.v2.html", "a.b/c", "seven.", ".hidden", "x"].map(removeExtension))
      .toEqual(["a/b", "a/b.v2", "a.b/c", "seven.", "", "x"]);
  });

  it("toCandidateUrlPath gives the URL path of the generated page", async () => {
    const { toCandidateUrlPath } = await import("../src/spec-files.js");
    expect(toCandidateUrlPath("a\\b c.yaml")).toBe("/candidate/a/b c.html");
    expect(toCandidateUrlPath("100% #1?.htm")).toBe("/candidate/100%25 %231%3F.html");
    expect(toCandidateUrlPath("x.h%tml")).toBe("/candidate/x.html");
  });

  it("createLiquidEngine registers the slug and remove_ext filters", async () => {
    const { createLiquidEngine } = await import("../src/render/liquid.js");
    const engine = createLiquidEngine();
    expect(engine.parseAndRenderSync(
      "{{ title | slug: 'fallback' }}|{{ '' | slug: 'Fall Back' }}|{{ path | remove_ext }}|{{ 3 | remove_ext }}|{{ html }}",
      { title: "Hello World!", path: "a/b.yaml", html: "<b>" },
    )).toBe("hello-world|fall-back|a/b||<b>");
  });
});
