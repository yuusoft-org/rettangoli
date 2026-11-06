/**
 * Goldens for the generated browser entry (`virtual:rettangoli-fe-entry`).
 *
 * The entry is plain text assembled by string templates. Everything apps and
 * the dev server rely on is in it: the `__rtgl_<N>_<type>` declaration names,
 * registration order, the literal `[data-rtgl-hydrate]` probe, the bare
 * `@rettangoli/fe` import for builds versus `/@fs/` paths for serve, and the
 * i18n runtime setup. Refactors of the generator must leave these bytes alone.
 *
 * Absolute paths are replaced by `<ROOT>` before comparing. To rewrite the
 * goldens after an intended change:
 *   UPDATE_GOLDENS=1 npx vitest run test/cli/entry-source.golden.test.js
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { load as loadYaml } from "js-yaml";
import { afterEach, describe, expect, it } from "vitest";

import { generateFrontendEntrySource } from "../../src/cli/frontendEntrySource.js";

const PKG = path.resolve(import.meta.dirname, "../..");
const REPO_ROOT = path.resolve(PKG, "../..");
const GOLDEN_DIR = path.join(import.meta.dirname, "__goldens__");
const UPDATE = process.env.UPDATE_GOLDENS === "1";

// A temporary project is `<ROOT>`; the repository (the fe runtime path in serve mode) is `<REPO>`.
const normalize = (text, projectRoot = REPO_ROOT) => (
  text.replaceAll(REPO_ROOT, projectRoot === REPO_ROOT ? "<ROOT>" : "<REPO>").replaceAll(projectRoot, "<ROOT>")
);

const expectGolden = (name, actual) => {
  const goldenPath = path.join(GOLDEN_DIR, name);
  const contents = `${actual}\n`;
  if (UPDATE) {
    mkdirSync(GOLDEN_DIR, { recursive: true });
    writeFileSync(goldenPath, contents);
    return;
  }
  expect(existsSync(goldenPath), `missing golden ${name}; run with UPDATE_GOLDENS=1`).toBe(true);
  expect(contents).toBe(readFileSync(goldenPath, "utf8"));
};

// dirs, setup and i18n come from the fixture's own rettangoli.config.yaml.
const readFixtureConfig = (suite) => {
  const cwd = path.join(PKG, "e2e", suite);
  const { fe } = loadYaml(readFileSync(path.join(cwd, "rettangoli.config.yaml"), "utf8"));
  return { cwd, dirs: fe.dirs, setup: fe.setup, i18n: fe.i18n ?? null };
};

describe("generated entry source goldens", () => {
  it.each([
    ["dashboard", "build"],
    ["dashboard", "serve"],
    ["interactions", "build"],
    ["interactions", "serve"],
  ])("e2e/%s %s entry", (suite, command) => {
    const { cwd, dirs, setup, i18n } = readFixtureConfig(suite);
    const source = generateFrontendEntrySource({ cwd, dirs, setup, command, i18n });
    expectGolden(`entry-${suite}-${command}.txt`, normalize(source, REPO_ROOT));
  });

  it("covers both an app without i18n and one with i18n", () => {
    expect(readFixtureConfig("dashboard").i18n).toBeNull();
    expect(readFixtureConfig("interactions").i18n).toEqual({
      dir: "fe/i18n",
      defaultLocale: "en",
      fallbackLocale: "en",
      locales: ["en", "vi"],
    });
  });

  it("refuses an app that uses i18n keys when no i18n config is passed", () => {
    const { cwd, dirs, setup } = readFixtureConfig("interactions");
    expect(() => generateFrontendEntrySource({ cwd, dirs, setup, command: "build", i18n: null }))
      .toThrow(/^\[Build\] Component contract validation failed:\nRTGL-I18N-002 fe\/i18nPanel: i18n reference "\$\{i18n\.i18nPanel\.title\}" requires fe\.i18n configuration\./);
  });
});

describe("generated entry source from a temporary project", () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.splice(0).forEach((dirPath) => rmSync(dirPath, { recursive: true, force: true }));
  });

  const createProject = (files) => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-entry-golden-"));
    createdDirs.push(rootDir);
    for (const [relativePath, content] of Object.entries(files)) {
      const filePath = path.join(rootDir, relativePath);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, content);
    }
    return rootDir;
  };

  const i18nProject = () => createProject({
    "setup.js": "export const deps = { pages: { api: 1 } };\n",
    "src/pages/home/home.schema.yaml": "componentName: x-home\npropsSchema:\n  type: object\n  properties:\n    name: {}\n",
    "src/pages/home/home.view.yaml": [
      "template:",
      "  - 'div#root':",
      "      - h1: ${i18n.common.title}",
      "      - x-badge: null",
      "",
    ].join("\n"),
    "src/pages/home/home.store.js": "export const createInitialState = () => ({});\n",
    "src/pages/home/home.handlers.js": "export const handleBeforeMount = () => {};\n",
    "src/pages/home/home.constants.yaml": "limit: 3\n",
    "src/components/badge/badge.schema.yaml": "componentName: x-badge\n",
    "src/components/badge/badge.view.yaml": "template:\n  - span: ${i18n.common.badge}\n",
    "src/i18n/en.yaml": "common:\n  title: Hello\n  badge: New\n",
    "src/i18n/vi.yaml": "common:\n  title: Xin chao\n  badge: Moi\n",
  });

  const i18nConfig = {
    dir: "src/i18n",
    defaultLocale: "en",
    fallbackLocale: "en",
    locales: ["en", "vi"],
  };

  it.each(["build", "serve"])("i18n fixture %s entry", (command) => {
    const rootDir = i18nProject();
    const source = generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["src/components", "src/pages"],
      setup: "setup.js",
      command,
      i18n: i18nConfig,
    });
    expectGolden(`entry-i18n-fixture-${command}.txt`, normalize(source, rootDir));
  });

  it("registers a parent before the components its view renders when the page holds server markup", () => {
    const rootDir = i18nProject();
    const source = generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["src/components", "src/pages"],
      setup: "setup.js",
      command: "build",
      i18n: i18nConfig,
    });
    expect(source).toContain('const __rtglRegistrationOrder = [["components","badge"],["pages","home"]];');
    expect(source).toContain('const __rtglHydrationRegistrationOrder = [["pages","home"],["components","badge"]];');
  });

  describe("files that do not parse", () => {
    const broken = (files) => {
      const rootDir = createProject({
        "setup.js": "export const deps = {};\n",
        "components/broken/broken.schema.yaml": "componentName: x-broken\n",
        "components/broken/broken.view.yaml": "template:\n  - p: x\n",
        ...files,
      });
      try {
        generateFrontendEntrySource({ cwd: rootDir, dirs: ["components"], setup: "setup.js", command: "build" });
      } catch (error) {
        return normalize(error.message, rootDir);
      }
      throw new Error("expected generateFrontendEntrySource to throw");
    };

    // Known gap: the message is js-yaml's own, with no file path in it.
    it("reports a broken view with js-yaml's message only", () => {
      expect(broken({ "components/broken/broken.view.yaml": "template: [unclosed\n" })).toBe(
        "unexpected end of the stream within a flow collection (2:1)\n\n"
        + " 1 | template: [unclosed\n"
        + " 2 | \n"
        + "-----^",
      );
    });

    it("reports a broken schema with js-yaml's message only", () => {
      expect(broken({ "components/broken/broken.schema.yaml": "componentName: [x-broken\n" })).toBe(
        "unexpected end of the stream within a flow collection (2:1)\n\n"
        + " 1 | componentName: [x-broken\n"
        + " 2 | \n"
        + "-----^",
      );
    });

    it("names the file and carries jempl's message for an invalid template", () => {
      expect(broken({ "components/broken/broken.view.yaml": "template:\n  - $for x: []\n" })).toBe(
        "[Build] Error parsing template in file: <ROOT>/components/broken/broken.view.yaml\n"
        + "Parse Error: Invalid loop syntax - missing 'in' keyword (got: '$for x')",
      );
    });

    it("names the file and prefix for a constants file that is not an object", () => {
      expect(broken({ "components/broken/broken.constants.yaml": "- 1\n- 2\n" })).toBe(
        "[Build] <ROOT>/components/broken/broken.constants.yaml must contain a YAML object at the root.",
      );
    });
  });
});
