import { EventEmitter } from "node:events";
import { readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import generate from "../../src/cli/generate.js";
import report from "../../src/cli/report.js";
import {
  createRettangoliVtWatchPlugin,
  generateVtWatchSite,
  generateVtWatchSpecs,
} from "../../src/cli/watch-plugin.js";
import {
  createTempProject,
  inProjectDir,
  listFiles,
  recolorLeadingPixels,
  solidPixels,
  writeProjectFile,
  writeWebp,
} from "../support/temp-project.js";

// Every file under vt/specs was treated as a spec. Finder's .DS_Store, editor backups
// (foo.html~, #foo.html#), hidden directories and Emacs lock files (a dangling .#a.html symlink)
// became candidate pages, fed frontmatter overrides to report, or made discovery throw ENOENT.
// Names that start with ".", end with "~" or look like "#...#" are no longer specs.

const CONFIG = "vt:\n  path: ./vt\n  sections:\n    - title: Forms\n      files: forms\n";

function addStrays(root) {
  writeProjectFile(root, "vt/specs/forms/.DS_Store", Buffer.from([0, 0, 0, 1, 0x42, 0x75, 0x64, 0x31]));
  writeProjectFile(root, "vt/specs/forms/.hidden/x.html", "<div>hidden</div>\n");
  writeProjectFile(root, "vt/specs/forms/foo.html~", "---\ndiffThreshold: 50\n---\n<div>old foo</div>\n");
  writeProjectFile(root, "vt/specs/forms/#foo.html#", "---\ntitle: [unterminated\n---\n<div>autosave</div>\n");
  symlinkSync("user@host.12345:1700000000", join(root, "vt/specs/forms/.#a.html"));
}

describe.sequential("stray files under vt/specs are not specs", () => {
  let project = null;

  beforeEach(() => {
    project = createTempProject({ prefix: "rettangoli-vt-stray-spec-files-" });
    writeProjectFile(project.root, "rettangoli.config.yaml", CONFIG);
    writeProjectFile(project.root, "vt/specs/forms/foo.html", "<div>foo</div>\n");
    writeProjectFile(project.root, "vt/specs/forms/bar.yaml", "---\ntitle: bar\n---\nbar: 1\n");
    addStrays(project.root);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  it("generate builds only the real specs", async () => {
    await inProjectDir(project.root, () => generate({ captureScreenshots: false }));
    const candidates = listFiles(join(project.root, ".rettangoli/vt/_site/candidate"))
      .filter((file) => file.endsWith(".html"));
    expect(candidates).toEqual(["forms/bar.html", "forms/foo.html"]);
  });

  it("report ignores frontmatter in backup files", async () => {
    const red = solidPixels(2, 2, [255, 0, 0]);
    await writeWebp(join(project.root, "vt/reference/forms/foo-01.webp"), { width: 2, height: 2, pixels: red });
    await writeWebp(join(project.root, ".rettangoli/vt/_site/candidate/forms/foo-01.webp"), {
      width: 2,
      height: 2,
      pixels: recolorLeadingPixels(red, 1, [0, 0, 255]),
    });
    await expect(inProjectDir(project.root, () => report({}))).rejects.toThrow(
      "Visual differences found in 1 file(s).",
    );
    const json = JSON.parse(readFileSync(join(project.root, ".rettangoli/vt/report.json"), "utf8"));
    expect(json.items.map((item) => item.path)).toEqual(["candidate/forms/foo-01.webp"]);
  });

  it("watch mode ignores them", async () => {
    const cwd = project.root;
    await generateVtWatchSite({ cwd });
    const candidateDir = join(cwd, ".rettangoli/vt/_site/candidate");
    expect(listFiles(candidateDir).filter((file) => file.endsWith(".html"))).toEqual([
      "forms/bar.html",
      "forms/foo.html",
    ]);

    const specsDir = join(cwd, "vt/specs");
    const result = await generateVtWatchSpecs({
      cwd,
      filePaths: [join(specsDir, "forms/.hidden/x.html"), join(specsDir, "forms/#foo.html#")],
    });
    expect(result.outputPaths).toEqual([]);

    writeProjectFile(cwd, "vt/specs/forms/foo.html", "<div>foo v2</div>\n");
    const updated = await generateVtWatchSpecs({ cwd, filePaths: [join(specsDir, "forms/foo.html")] });
    expect(updated.outputPaths).toEqual([join(candidateDir, "forms/foo.html")]);
    expect(readFileSync(join(candidateDir, "forms/foo.html"), "utf8")).toContain("foo v2");
  });
});

describe("the watch plugin ignores events for stray files", () => {
  let project = null;

  afterEach(() => {
    project?.cleanup();
    project = null;
  });

  it("reloads only the real spec when its change arrives with events for lock files and hidden directories", async () => {
    project = createTempProject({ prefix: "rettangoli-vt-stray-spec-files-plugin-" });
    const cwd = project.root;
    writeProjectFile(cwd, "rettangoli.config.yaml", CONFIG);
    writeProjectFile(cwd, "vt/specs/forms/foo.html", "<div>foo</div>\n");

    const watcher = new EventEmitter();
    watcher.add = vi.fn();
    const server = {
      middlewares: { use: vi.fn() },
      moduleGraph: { getModuleById: vi.fn() },
      watcher,
      ws: { on: vi.fn(), send: vi.fn() },
    };
    const plugin = createRettangoliVtWatchPlugin({
      cwd,
      debounceMs: 5,
      createWatchClientModuleSource: () => "",
      logger: { log: vi.fn(), error: vi.fn() },
    });
    await plugin.configureServer(server);

    // Created after startup, as an editor would: a dangling Emacs lock and a hidden directory.
    const lockPath = join(cwd, "vt/specs/forms/.#foo.html");
    symlinkSync("user@host.12345:1700000000", lockPath);
    writeProjectFile(cwd, "vt/specs/forms/.hidden/x.html", "<div>hidden</div>\n");
    const hiddenPath = join(cwd, "vt/specs/forms/.hidden/x.html");
    watcher.emit("add", lockPath);
    watcher.emit("add", hiddenPath);
    watcher.emit("change", hiddenPath);
    // A real change in the same burst lands in the same debounced flush as any misclassified stray.
    writeProjectFile(cwd, "vt/specs/forms/foo.html", "<div>foo v2</div>\n");
    watcher.emit("change", join(cwd, "vt/specs/forms/foo.html"));

    await vi.waitFor(() => expect(server.ws.send).toHaveBeenCalled(), { timeout: 5000 });
    expect(server.ws.send).toHaveBeenCalledTimes(1);
    expect(server.ws.send.mock.calls[0][0].data).toMatchObject({
      type: "reload-current",
      paths: ["specs/forms/foo.html"],
    });
  });
});
