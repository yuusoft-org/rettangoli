import path from "node:path";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import {
  RETTANGOLI_FE_VIRTUAL_ENTRY_ID,
  createRettangoliFeVitePlugin,
} from "../../src/cli/vitePlugin.js";

const createFixtureProject = () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-vite-plugin-"));
  const componentDir = path.join(rootDir, "components", "counter");
  mkdirSync(componentDir, { recursive: true });

  writeFileSync(path.join(rootDir, "setup.js"), "export const deps = { components: {} };");
  writeFileSync(
    path.join(componentDir, "counter.schema.yaml"),
    "componentName: x-counter\n",
  );
  writeFileSync(path.join(componentDir, "counter.view.yaml"), "template:\n  - 'div#root':\n");
  writeFileSync(
    path.join(componentDir, "counter.store.js"),
    "export const createInitialState = () => ({ count: 0 });\n",
  );

  return rootDir;
};

describe("vite plugin", () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it("resolves and loads virtual entry module", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const plugin = createRettangoliFeVitePlugin({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      errorPrefix: "[Build]",
    });

    const resolved = plugin.resolveId(RETTANGOLI_FE_VIRTUAL_ENTRY_ID);
    expect(resolved).toBe(`\0${RETTANGOLI_FE_VIRTUAL_ENTRY_ID}`);

    const source = plugin.load(resolved);
    expect(source).toContain("import { createComponent } from \"@rettangoli/fe\";");
    expect(source).toContain("customElements.define(elementName, webComponent);");
  });

  it("switches to /@fs imports in serve mode", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const plugin = createRettangoliFeVitePlugin({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      errorPrefix: "[Watch]",
    });

    plugin.configResolved({ command: "serve" });

    const source = plugin.load(`\0${RETTANGOLI_FE_VIRTUAL_ENTRY_ID}`);
    expect(source).toContain("/@fs");
  });
});
