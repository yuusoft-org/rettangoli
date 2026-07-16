import path from "node:path";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

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

const addI18nFiles = (rootDir) => {
  const i18nDir = path.join(rootDir, "src", "i18n");
  mkdirSync(i18nDir, { recursive: true });
  writeFileSync(path.join(i18nDir, "en.yaml"), "common:\n  title: \"Hello\"\n");
  writeFileSync(path.join(i18nDir, "vi.yaml"), "common:\n  title: \"Xin chao\"\n");
  return i18nDir;
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

  it("registers component, setup, and i18n sources with the Vite watcher", () => {
    const rootDir = createFixtureProject();
    const i18nDir = addI18nFiles(rootDir);
    createdDirs.push(rootDir);

    const plugin = createRettangoliFeVitePlugin({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      i18n: {
        dir: "src/i18n",
        defaultLocale: "en",
        fallbackLocale: "en",
        locales: ["en", "vi"],
      },
      errorPrefix: "[Watch]",
    });

    const server = {
      watcher: {
        add: vi.fn(),
        on: vi.fn(),
      },
      moduleGraph: {
        getModuleById: vi.fn(),
      },
      ws: {
        send: vi.fn(),
      },
    };

    plugin.configureServer(server);

    expect(server.watcher.add).toHaveBeenCalledTimes(1);
    expect(server.watcher.add.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        path.join(rootDir, "components"),
        path.join(rootDir, "setup.js"),
        path.join(rootDir, "components", "counter", "counter.schema.yaml"),
        path.join(rootDir, "components", "counter", "counter.view.yaml"),
        path.join(rootDir, "components", "counter", "counter.store.js"),
        i18nDir,
        path.join(i18nDir, "en.yaml"),
        path.join(i18nDir, "vi.yaml"),
      ]),
    );

    const watcherHandlers = Object.fromEntries(server.watcher.on.mock.calls);
    watcherHandlers.add(
      path.join(rootDir, "components", "newComponent", "newComponent.view.yaml"),
    );
    watcherHandlers.unlink(
      path.join(rootDir, "components", "counter", "counter.view.yaml"),
    );

    expect(server.ws.send).toHaveBeenCalledTimes(2);
    expect(server.ws.send).toHaveBeenLastCalledWith({ type: "full-reload" });
  });
});
