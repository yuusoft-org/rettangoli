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
    expect(source).toContain("defineOrUpdateComponent");
    expect(source).toContain("import.meta.hot.accept(");
  });

  it("returns the virtual entry as an HMR boundary for compatible component changes", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const plugin = createRettangoliFeVitePlugin({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      errorPrefix: "[Watch]",
    });
    const virtualEntryModule = { id: `\0${RETTANGOLI_FE_VIRTUAL_ENTRY_ID}` };
    const changedModule = { id: "counter.store.js" };
    const server = {
      watcher: {
        add: vi.fn(),
        on: vi.fn(),
      },
      moduleGraph: {
        getModuleById: vi.fn(() => virtualEntryModule),
        invalidateModule: vi.fn(),
      },
      ws: {
        send: vi.fn(),
      },
    };
    plugin.configureServer(server);

    const timestamp = 1234;
    const modules = plugin.handleHotUpdate({
      file: path.join(rootDir, "components", "counter", "counter.store.js"),
      modules: [changedModule],
      timestamp,
    });

    expect(modules).toEqual([changedModule, virtualEntryModule]);
    expect(server.moduleGraph.invalidateModule).toHaveBeenCalledWith(
      virtualEntryModule,
      expect.any(Set),
      timestamp,
      true,
    );
    expect(server.ws.send).not.toHaveBeenCalled();
  });

  it("routes schema changes through the runtime HMR compatibility gate", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const plugin = createRettangoliFeVitePlugin({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      errorPrefix: "[Watch]",
    });
    const virtualEntryModule = { id: `\0${RETTANGOLI_FE_VIRTUAL_ENTRY_ID}` };
    const server = {
      watcher: {
        add: vi.fn(),
        on: vi.fn(),
      },
      moduleGraph: {
        getModuleById: vi.fn(() => virtualEntryModule),
        invalidateModule: vi.fn(),
      },
      ws: {
        send: vi.fn(),
      },
    };
    plugin.configureServer(server);

    const modules = plugin.handleHotUpdate({
      file: path.join(
        rootDir,
        "components",
        "counter",
        "counter.schema.yaml",
      ),
      modules: [],
      timestamp: 3456,
    });

    expect(modules).toEqual([virtualEntryModule]);
    expect(server.ws.send).not.toHaveBeenCalled();
  });

  it("leaves imported helper changes to ordinary Vite HMR propagation", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const plugin = createRettangoliFeVitePlugin({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      errorPrefix: "[Watch]",
    });
    const server = {
      watcher: {
        add: vi.fn(),
        on: vi.fn(),
      },
      moduleGraph: {
        getModuleById: vi.fn(),
        invalidateModule: vi.fn(),
      },
      ws: {
        send: vi.fn(),
      },
    };
    plugin.configureServer(server);

    const changedModule = { id: "counter.helper.js" };
    expect(plugin.handleHotUpdate({
      file: path.join(rootDir, "components", "counter", "counter.helper.js"),
      modules: [changedModule],
      timestamp: 2345,
    })).toBeUndefined();
    expect(server.moduleGraph.invalidateModule).not.toHaveBeenCalled();
    expect(server.ws.send).not.toHaveBeenCalled();
  });

  it("performs a full reload when an untracked helper is imported by setup", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const plugin = createRettangoliFeVitePlugin({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      errorPrefix: "[Watch]",
    });
    const setupModule = {
      id: path.join(rootDir, "setup.js"),
      importers: new Set(),
    };
    const helperModule = {
      id: path.join(rootDir, "setup-helper.js"),
      importers: new Set([setupModule]),
    };
    const server = {
      watcher: {
        add: vi.fn(),
        on: vi.fn(),
      },
      moduleGraph: {
        getModuleById: vi.fn(),
        getModulesByFile: vi.fn(() => new Set([helperModule])),
        invalidateModule: vi.fn(),
      },
      ws: {
        send: vi.fn(),
      },
    };
    plugin.configureServer(server);

    expect(plugin.handleHotUpdate({
      file: path.join(rootDir, "setup-helper.js"),
      modules: [],
      timestamp: 3456,
    })).toEqual([]);
    expect(server.moduleGraph.getModulesByFile).toHaveBeenCalledWith(
      path.join(rootDir, "setup-helper.js"),
    );
    expect(server.ws.send).toHaveBeenCalledWith({ type: "full-reload" });
  });

  it("performs a full reload for setup changes", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const plugin = createRettangoliFeVitePlugin({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      errorPrefix: "[Watch]",
    });
    const virtualEntryModule = { id: `\0${RETTANGOLI_FE_VIRTUAL_ENTRY_ID}` };
    const server = {
      watcher: {
        add: vi.fn(),
        on: vi.fn(),
      },
      moduleGraph: {
        getModuleById: vi.fn(() => virtualEntryModule),
        invalidateModule: vi.fn(),
      },
      ws: {
        send: vi.fn(),
      },
    };
    plugin.configureServer(server);

    expect(plugin.handleHotUpdate({
      file: path.join(rootDir, "setup.js"),
      modules: [],
      timestamp: 4321,
    })).toEqual([]);
    expect(server.ws.send).toHaveBeenCalledWith({ type: "full-reload" });
  });

  it("routes i18n source changes through the virtual entry HMR boundary", () => {
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
    const virtualEntryModule = { id: `\0${RETTANGOLI_FE_VIRTUAL_ENTRY_ID}` };
    const server = {
      watcher: {
        add: vi.fn(),
        on: vi.fn(),
      },
      moduleGraph: {
        getModuleById: vi.fn(() => virtualEntryModule),
        invalidateModule: vi.fn(),
      },
      ws: {
        send: vi.fn(),
      },
    };
    plugin.configureServer(server);

    expect(plugin.handleHotUpdate({
      file: path.join(i18nDir, "vi.yaml"),
      modules: [],
      timestamp: 4321,
    })).toEqual([virtualEntryModule]);
    expect(server.ws.send).not.toHaveBeenCalled();
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
