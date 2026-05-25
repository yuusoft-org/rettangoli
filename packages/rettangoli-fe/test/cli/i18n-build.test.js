import path from "node:path";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import {
  analyzeI18nBuildContext,
  emitI18nAssets,
  getI18nPublicAssetPath,
  loadI18nBuildContext,
} from "../../src/cli/i18nBuild.js";

const createProject = ({
  enSource = [
    "common:",
    '  saveButton: "Save"',
    "projectsPage:",
    '  title: "Projects"',
    "",
  ].join("\n"),
  viSource = [
    "common:",
    '  saveButton: "Luu"',
    "projectsPage:",
    '  title: "Du an"',
    "",
  ].join("\n"),
} = {}) => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-i18n-"));
  const i18nDir = path.join(rootDir, "src", "i18n");
  mkdirSync(i18nDir, { recursive: true });
  writeFileSync(path.join(i18nDir, "en.yaml"), enSource);
  writeFileSync(path.join(i18nDir, "vi.yaml"), viSource);
  return rootDir;
};

const createI18nConfig = () => ({
  dir: "src/i18n",
  defaultLocale: "en",
  fallbackLocale: "en",
  locales: ["en", "vi"],
});

describe("i18n build support", () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it("loads locale YAML files and emits runtime JSON assets", () => {
    const rootDir = createProject();
    createdDirs.push(rootDir);

    const context = loadI18nBuildContext({
      cwd: rootDir,
      i18n: createI18nConfig(),
    });
    expect(context.enabled).toBe(true);
    expect(context.catalogs.en.projectsPage.title).toBe("Projects");

    const emitted = emitI18nAssets({
      outDir: path.join(rootDir, "_site", "public"),
      i18nContext: context,
    });

    expect(emitted.map((asset) => asset.relativeFileName)).toEqual([
      "i18n/en.json",
      "i18n/vi.json",
    ]);
    const enJson = JSON.parse(
      readFileSync(path.join(rootDir, "_site", "public", "i18n", "en.json"), "utf8"),
    );
    expect(enJson.common.saveButton).toBe("Save");
  });

  it("reports nested or non-string catalog values", () => {
    const rootDir = createProject({
      enSource: [
        "common:",
        "  actions:",
        '    save: "Save"',
        "",
      ].join("\n"),
      viSource: [
        "common:",
        '  actions: "Luu"',
        "",
      ].join("\n"),
    });
    createdDirs.push(rootDir);

    const { errors } = analyzeI18nBuildContext({
      cwd: rootDir,
      i18n: createI18nConfig(),
    });

    expect(errors.some((error) => error.message.includes("nested too deeply"))).toBe(true);
  });

  it("reports keys missing from non-default locales", () => {
    const rootDir = createProject({
      viSource: [
        "common:",
        '  saveButton: "Luu"',
        "",
      ].join("\n"),
    });
    createdDirs.push(rootDir);

    const { errors } = analyzeI18nBuildContext({
      cwd: rootDir,
      i18n: createI18nConfig(),
    });

    expect(errors.map((error) => error.message).join("\n")).toContain(
      'vi.yaml is missing key "projectsPage.title"',
    );
  });

  it("derives public asset paths relative to the served entry", () => {
    expect(getI18nPublicAssetPath({
      publicEntryPath: "/static/public/main.js",
      relativeFileName: "i18n/en.json",
    })).toBe("/static/public/i18n/en.json");
  });
});
