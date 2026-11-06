/**
 * Component discovery. The browser entry, loadComponents, fe check (and
 * build-time validation), examples and the Vite watcher each list the
 * component files under the configured dirs. They share one pipeline but
 * keep the order each one always had: the entry and loadComponents sort by
 * localeCompare; check, examples and the watcher keep getAllFiles' depth-first
 * order. The fixtures below make the two orders differ.
 */

import path from "node:path";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { load as loadYaml } from "js-yaml";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  extractCategoryAndComponent,
  getAllFiles,
} from "../../src/commonBuild.js";
import {
  collectComponentContractEntriesFromDirs,
  isSupportedComponentFile,
} from "../../src/cli/contracts.js";
import examples from "../../src/cli/examples.js";
import { generateFrontendEntrySource } from "../../src/cli/frontendEntrySource.js";
import { createRettangoliFeVitePlugin } from "../../src/cli/vitePlugin.js";
import * as i18nBuild from "../../src/cli/i18nBuild.js";
import build from "../../src/cli/build.js";
import { loadComponents } from "../../src/server/index.js";

vi.mock("../../src/cli/i18nBuild.js", async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, loadI18nBuildContext: vi.fn(original.loadI18nBuildContext) };
});

const FE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const E2E_PROJECTS = [
  { name: "dashboard", i18n: null },
  {
    name: "interactions",
    i18n: { dir: "fe/i18n", defaultLocale: "en", fallbackLocale: "en", locales: ["en", "vi"] },
  },
].map(({ name, i18n }) => ({
  name,
  cwd: path.join(FE_DIR, "e2e", name),
  dirs: ["fe/components"],
  setup: "fe/setup.js",
  i18n,
}));

const tempDirs = [];

afterEach(() => {
  tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  vi.mocked(i18nBuild.loadI18nBuildContext).mockClear();
});

// Under the package (so a build resolves @rettangoli/fe), realpath'd so the
// macOS /var -> /private/var link does not show up in paths.
const createProject = (files, parent = tmpdir()) => {
  mkdirSync(parent, { recursive: true });
  const rootDir = realpathSync(mkdtempSync(path.join(parent, "rtgl-fe-discovery-")));
  tempDirs.push(rootDir);
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(rootDir, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  return rootDir;
};

const component = (dir, name, elementName, { store = false } = {}) => ({
  [`${dir}/${name}/${name}.schema.yaml`]: `componentName: ${elementName}\n`,
  [`${dir}/${name}/${name}.view.yaml`]: `template:\n  - div: ${name}\n`,
  ...(store ? { [`${dir}/${name}/${name}.store.js`]: "export const selectViewData = () => ({});\n" } : {}),
});

// Two dirs given as ["zeta", "alpha"], so getAllFiles lists zeta first while
// localeCompare puts alpha first; the nested folder and the unsupported files
// must be walked into and filtered out.
const NESTED = {
  "setup.js": "export const deps = {};\n",
  ...component("zeta/pages", "zHome", "x-z-home", { store: true }),
  ...component("zeta/pages", "Apple", "x-apple"),
  ...component("zeta/nested/pages", "deep", "x-deep"),
  ...component("alpha/components", "card", "x-card", { store: true }),
  ...component("alpha/components", "button", "x-button"),
  "alpha/components/card/card.examples.yaml": "title: Card\n---\nname: plain\nviewData: {}\n",
  "alpha/components/card/notes.md": "not a component file\n",
  "zeta/pages/zHome/zHome.handlers.js": "export const handleClick = () => {};\n",
  "zeta/pages/zHome/zHome.methods.js": "export const focus = () => {};\n",
  "zeta/pages/zHome/zHome.constants.yaml": "title: Home\n",
};
const NESTED_DIRS = ["zeta", "alpha"];

// js-yaml's message for the broken file below, which names no file.
const BROKEN_YAML = "template: [\n";
const brokenYamlMessage = (() => {
  try {
    loadYaml(BROKEN_YAML);
  } catch (error) {
    return error.message;
  }
  throw new Error("expected BROKEN_YAML not to parse");
})();

const walkOrder = (rootDir, dirs) =>
  getAllFiles(dirs.map((dir) => path.join(rootDir, dir))).filter((filePath) => isSupportedComponentFile(filePath));

const sortedOrder = (rootDir, dirs) =>
  walkOrder(rootDir, dirs).sort((a, b) => a.localeCompare(b));

describe("the fixture", () => {
  it("lists files in a different order when sorted", () => {
    const rootDir = createProject(NESTED);
    const walked = walkOrder(rootDir, NESTED_DIRS);
    expect(walked).toHaveLength(15);
    expect(sortedOrder(rootDir, NESTED_DIRS)).not.toEqual(walked);
    expect(path.relative(rootDir, walked[0]).startsWith("zeta/")).toBe(true);
  });
});

describe("fe check and build-time validation", () => {
  const expectedEntries = (files) => files.map((filePath) => {
    const { category, component: name, fileType } = extractCategoryAndComponent(filePath);
    const entry = { category, component: name, fileType, filePath };
    if (fileType === "view" || fileType === "schema") {
      entry.yamlObject = loadYaml(readFileSync(filePath, "utf8")) ?? {};
    }
    return entry;
  });

  it("collects supported files in getAllFiles order, with view and schema YAML", () => {
    const rootDir = createProject(NESTED);
    const dirs = NESTED_DIRS.map((dir) => path.join(rootDir, dir));
    const entries = collectComponentContractEntriesFromDirs(dirs);
    expect(entries).toEqual(expectedEntries(walkOrder(rootDir, NESTED_DIRS)));
    expect(entries.map((entry) => Object.keys(entry))[0]).toEqual(
      ["category", "component", "fileType", "filePath", "yamlObject"],
    );
  });

  it.each(E2E_PROJECTS)("collects the $name e2e project the same way", ({ cwd, dirs }) => {
    const resolvedDirs = dirs.map((dir) => path.join(cwd, dir));
    expect(collectComponentContractEntriesFromDirs(resolvedDirs)).toEqual(
      expectedEntries(walkOrder(cwd, dirs)),
    );
  });

  it("keeps relative dirs relative (to the process cwd)", () => {
    const rootDir = path.relative(process.cwd(), createProject(NESTED));
    const entries = collectComponentContractEntriesFromDirs(NESTED_DIRS.map((dir) => path.join(rootDir, dir)));
    expect(entries.map((entry) => entry.filePath)).toEqual(walkOrder(rootDir, NESTED_DIRS));
    expect(path.isAbsolute(entries[0].filePath)).toBe(false);
  });

  it("names the file when its YAML cannot be parsed", () => {
    const rootDir = createProject({ "c/bad/bad.view.yaml": BROKEN_YAML });
    expect(() => collectComponentContractEntriesFromDirs([path.join(rootDir, "c")])).toThrow(
      new Error(`[Check] Failed to read or parse ${path.join(rootDir, "c/bad/bad.view.yaml")}: ${brokenYamlMessage}`),
    );
  });
});

describe("the browser entry", () => {
  // `__rtgl_<n>_<fileType>` declarations, in the order they were emitted.
  const declarations = (source) => [...source.matchAll(/^(?:import \* as|const) (__rtgl_\d+_\w+)(?: from (".*"))?/gm)]
    .map(([, name, importPath]) => (importPath ? `${name} ${JSON.parse(importPath)}` : name));

  const expectedDeclarations = (files) => files.map((filePath, index) => {
    const { fileType } = extractCategoryAndComponent(filePath);
    const name = `__rtgl_${index}_${fileType}`;
    return ["handlers", "store", "methods"].includes(fileType) ? `${name} ${filePath}` : name;
  });

  it("declares supported files in localeCompare order", () => {
    const rootDir = createProject(NESTED);
    const source = generateFrontendEntrySource({ cwd: rootDir, dirs: NESTED_DIRS, setup: "setup.js", command: "build" });
    expect(declarations(source)).toEqual(expectedDeclarations(sortedOrder(rootDir, NESTED_DIRS)));
  });

  it.each(E2E_PROJECTS)("declares the $name e2e project in localeCompare order", ({ cwd, dirs, setup, i18n }) => {
    const source = generateFrontendEntrySource({ cwd, dirs, setup, i18n, command: "build" });
    expect(declarations(source)).toEqual(expectedDeclarations(sortedOrder(cwd, dirs)));
  });

  it("lets js-yaml name the file in a parse error", () => {
    const rootDir = createProject({ ...NESTED, "alpha/components/bad/bad.view.yaml": BROKEN_YAML });
    expect(() => generateFrontendEntrySource({ cwd: rootDir, dirs: NESTED_DIRS, setup: "setup.js" }))
      .toThrow(`in "${path.join(rootDir, "alpha/components/bad/bad.view.yaml")}"`);
  });
});

describe("loadComponents", () => {
  it("returns components in the order of their first file in localeCompare order", async () => {
    const rootDir = createProject(NESTED);
    const configs = await loadComponents({ cwd: rootDir, dirs: NESTED_DIRS });
    const expected = [...new Set(sortedOrder(rootDir, NESTED_DIRS).map((filePath) => {
      const { component: name } = extractCategoryAndComponent(filePath);
      return loadYaml(readFileSync(path.join(path.dirname(filePath), `${name}.schema.yaml`), "utf8")).componentName;
    }))];
    expect(configs.map((config) => config.schema.componentName)).toEqual(expected);
    expect(expected[0]).toBe("x-button");
  });

  it("names the file when its YAML cannot be parsed", async () => {
    const rootDir = createProject({ ...component("c", "bad", "x-bad"), "c/bad/bad.view.yaml": BROKEN_YAML });
    await expect(loadComponents({ cwd: rootDir, dirs: ["c"] })).rejects.toThrow(
      new Error(`[loadComponents] failed to parse ${path.join(rootDir, "c/bad/bad.view.yaml")}: ${brokenYamlMessage}`),
    );
  });
});

describe("examples", () => {
  it("walks the dirs in getAllFiles order, so with a repeated name the last dir walked wins", () => {
    const rootDir = createProject({
      ...component("zeta/components", "card", "x-card"),
      ...component("alpha/components", "card", "x-card"),
      "zeta/components/card/card.examples.yaml": "title: Card\n---\nname: plain\nviewData: {}\n",
      "alpha/components/card/card.examples.yaml": "title: Card\n---\nname: plain\nviewData: {}\n",
      "zeta/components/card/card.view.yaml": "template:\n  - span: from zeta\n",
      "alpha/components/card/card.view.yaml": "template:\n  - span: from alpha\n",
    });
    const outputDir = path.join(rootDir, "out");
    examples({ dirs: NESTED_DIRS.map((dir) => path.join(rootDir, dir)), outputDir });
    expect(readFileSync(path.join(outputDir, "components/card/plain.html"), "utf8"))
      .toBe("---\ntitle: card-0\n---\n\n<span>from alpha</span>");
  });
});

describe("the Vite plugin's watched files", () => {
  it("adds the setup file, then supported files in getAllFiles order", () => {
    const rootDir = createProject(NESTED);
    const plugin = createRettangoliFeVitePlugin({ cwd: rootDir, dirs: NESTED_DIRS, setup: "setup.js" });
    const watched = [];
    plugin.load.call({ addWatchFile: (filePath) => watched.push(filePath) }, "\0virtual:rettangoli-fe-entry");
    expect(watched).toEqual([path.join(rootDir, "setup.js"), ...walkOrder(rootDir, NESTED_DIRS)]);
  });
});

describe("i18n catalogs", () => {
  const I18N_PROJECT = {
    ...NESTED,
    "zeta/pages/zHome/zHome.view.yaml": "template:\n  - div: ${i18n.common.title}\n",
    "i18n/en.yaml": "common:\n  title: Hello\n",
    "i18n/vi.yaml": "common:\n  title: Xin chao\n",
  };
  const i18n = { dir: "i18n", defaultLocale: "en", fallbackLocale: "en", locales: ["en", "vi"] };

  it("are loaded once per build", async () => {
    const rootDir = createProject(I18N_PROJECT, path.join(FE_DIR, ".tmp-tests"));
    await build({ cwd: rootDir, dirs: NESTED_DIRS, setup: "setup.js", outfile: "out/main.js", i18n });
    expect(existsSync(path.join(rootDir, "out/main.js"))).toBe(true);
    expect(JSON.parse(readFileSync(path.join(rootDir, "out/i18n/vi.json"), "utf8"))).toEqual({ common: { title: "Xin chao" } });
    expect(i18nBuild.loadI18nBuildContext).toHaveBeenCalledTimes(1);
  });

  it("passed in, give the same entry as when they are loaded", () => {
    const rootDir = createProject(I18N_PROJECT);
    const options = { cwd: rootDir, dirs: NESTED_DIRS, setup: "setup.js", i18n };
    for (const command of ["build", "serve"]) {
      const loaded = generateFrontendEntrySource({ ...options, command });
      const i18nContext = i18nBuild.loadI18nBuildContext({ cwd: rootDir, i18n });
      vi.mocked(i18nBuild.loadI18nBuildContext).mockClear();
      expect(generateFrontendEntrySource({ ...options, command, i18nContext })).toBe(loaded);
      expect(i18nBuild.loadI18nBuildContext).not.toHaveBeenCalled();
    }
  });

  it("are reloaded on every watch-mode entry when none are passed in", () => {
    const rootDir = createProject(I18N_PROJECT);
    const plugin = createRettangoliFeVitePlugin({ cwd: rootDir, dirs: NESTED_DIRS, setup: "setup.js", i18n });
    plugin.configResolved({ command: "serve" });
    const first = plugin.load.call({}, "\0virtual:rettangoli-fe-entry");
    writeFileSync(path.join(rootDir, "i18n/en.yaml"), "common:\n  title: Hi\n");
    const second = plugin.load.call({}, "\0virtual:rettangoli-fe-entry");
    expect(first).toContain('"title":"Hello"');
    expect(second).toContain('"title":"Hi"');
  });
});
