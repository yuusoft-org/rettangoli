import path from "node:path";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import { generateFrontendEntrySource } from "../../src/cli/frontendEntrySource.js";

const toPosixPath = (value) => value.split(path.sep).join("/");

const createFixtureProject = ({
  setupSource = "export const deps = { components: {} };",
  constantsSource = null,
  viewSource = "template:\n  - 'div#root':\n",
  includeSchema = true,
} = {}) => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-vite-entry-"));
  const componentDir = path.join(rootDir, "components", "counter");
  mkdirSync(componentDir, { recursive: true });

  writeFileSync(path.join(rootDir, "setup.js"), setupSource);
  if (includeSchema) {
    writeFileSync(
      path.join(componentDir, "counter.schema.yaml"),
      "componentName: x-counter\n",
    );
  }
  writeFileSync(path.join(componentDir, "counter.view.yaml"), viewSource);
  writeFileSync(
    path.join(componentDir, "counter.store.js"),
    "export const createInitialState = () => ({ count: 0 });\n",
  );

  if (constantsSource !== null) {
    writeFileSync(
      path.join(componentDir, "counter.constants.yaml"),
      constantsSource,
    );
  }

  return rootDir;
};

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const executeServeSource = async ({
  source,
  createI18nRuntime,
  defineOrUpdateComponents,
  deps,
  hot,
}) => {
  const moduleNamespaceNames = [
    ...source.matchAll(/^import \* as (\w+) from .+;$/gm),
  ].map((match) => match[1]);
  const moduleNamespaces = Object.fromEntries(
    moduleNamespaceNames.map((name) => [name, {}]),
  );
  const executableSource = source
    .replace(
      /^import \* as (\w+) from .+;$/gm,
      "const $1 = __moduleNamespaces.$1;",
    )
    .replace(/^import \{[^}]+\} from .+;$/gm, "")
    .replaceAll("import.meta.hot", "__hot")
    .replaceAll("import.meta.url", "__moduleUrl")
    .replace(
      "export const __rtglHmrState =",
      "const __rtglHmrState =",
    )
    .concat("\nreturn { __rtglHmrState };\n");
  const execute = new AsyncFunction(
    "__moduleNamespaces",
    "__moduleUrl",
    "__hot",
    "createI18nRuntime",
    "defineOrUpdateComponents",
    "deps",
    executableSource,
  );

  return execute(
    moduleNamespaces,
    "http://localhost/public/main.js",
    hot,
    createI18nRuntime,
    defineOrUpdateComponents,
    deps,
  );
};

describe("frontend entry source generator", () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it("generates build-mode source with component registrations", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const source = generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      command: "build",
      errorPrefix: "[Build]",
    });

    const setupPath = toPosixPath(path.join(rootDir, "setup.js"));
    const storePath = toPosixPath(
      path.join(rootDir, "components", "counter", "counter.store.js"),
    );

    expect(source).toContain(`import { deps } from "${setupPath}";`);
    expect(source).toContain(`from "${storePath}";`);
    expect(source).toContain(`imports["components"]["counter"]["store"]`);
    expect(source).toContain("customElements.define(elementName, webComponent);");
    expect(source).not.toContain("import.meta.hot");
  });

  it("generates serve-mode source with /@fs imports and an HMR boundary", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const source = generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      command: "serve",
      errorPrefix: "[Watch]",
    });

    const setupPath = toPosixPath(path.join(rootDir, "setup.js"));
    const storePath = toPosixPath(
      path.join(rootDir, "components", "counter", "counter.store.js"),
    );

    expect(source).toContain(`import { deps } from "/@fs${setupPath}";`);
    expect(source).toContain(`from "/@fs${storePath}";`);
    expect(source).toMatch(
      /import \{ defineOrUpdateComponents \} from "\/@fs\/.+\/rettangoli-fe\/src\/index\.js";/,
    );
    expect(source).toContain("__rtglComponentUpdateBatch.push({");
    expect(source).toContain("componentId: `${category}/${component}`,");
    expect(source).toContain("componentConfig: { ...componentConfig },");
    expect(source).toContain(
      "fingerprint: __rtglComponentFingerprints[category][component],",
    );
    expect(source).toMatch(
      /const __rtglComponentFingerprints = \{"components":\{"counter":"[a-f0-9]{64}"\}\};/,
    );
    expect(source).toContain("const __rtglBatchResult = defineOrUpdateComponents({");
    expect(source).toContain("components: __rtglComponentUpdateBatch,");
    expect(source).toContain("__rtglBatchResult.message || __rtglBatchResult.reason");
    expect(source).toContain("import.meta.hot.data.__rtglInitialized = true;");
    expect(source).toContain("if (!__rtglIsHmrUpdate) {");
    expect(source).toContain("error instanceof Error ? error.message : String(error)");
    expect(source).toContain("import.meta.hot.accept((nextModule) => {");
    expect(source).toContain("import.meta.hot.invalidate(");
    expect(source).not.toContain("customElements.define(elementName, webComponent);");
  });

  it("changes only the edited component fingerprint", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);
    const otherComponentDir = path.join(rootDir, "components", "label");
    mkdirSync(otherComponentDir, { recursive: true });
    writeFileSync(
      path.join(otherComponentDir, "label.schema.yaml"),
      "componentName: x-label\n",
    );
    writeFileSync(
      path.join(otherComponentDir, "label.view.yaml"),
      "template:\n  - 'span#root': Label\n",
    );

    const generateSource = () => generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      command: "serve",
      errorPrefix: "[Watch]",
    });
    const readFingerprints = (source) => {
      const match = source.match(
        /const __rtglComponentFingerprints = (\{[^;]+\});/,
      );
      return JSON.parse(match[1]);
    };

    const initialFingerprints = readFingerprints(generateSource());
    writeFileSync(
      path.join(rootDir, "components", "counter", "counter.view.yaml"),
      "template:\n  - 'div#root': Updated\n",
    );
    const nextFingerprints = readFingerprints(generateSource());

    expect(nextFingerprints.components.counter).not.toBe(
      initialFingerprints.components.counter,
    );
    expect(nextFingerprints.components.label).toBe(
      initialFingerprints.components.label,
    );
  });

  it("generates i18n runtime setup when configured", () => {
    const rootDir = createFixtureProject({
      viewSource: [
        "template:",
        "  - 'div#root': ${i18n.common.title}",
        "",
      ].join("\n"),
    });
    createdDirs.push(rootDir);
    const i18nDir = path.join(rootDir, "src", "i18n");
    mkdirSync(i18nDir, { recursive: true });
    writeFileSync(
      path.join(i18nDir, "en.yaml"),
      [
        "common:",
        '  title: "Hello"',
        "",
      ].join("\n"),
    );
    writeFileSync(
      path.join(i18nDir, "vi.yaml"),
      [
        "common:",
        '  title: "Xin chao"',
        "",
      ].join("\n"),
    );

    const source = generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      command: "build",
      i18n: {
        dir: "src/i18n",
        defaultLocale: "en",
        fallbackLocale: "en",
        locales: ["en", "vi"],
      },
    });

    expect(source).toContain("createComponent, createI18nRuntime");
    expect(source).toContain("await __rtglI18nRuntime.ready();");
    expect(source).toContain("./i18n/en.json");
    expect(source).toContain("__rtglFrameworkDeps");
    expect(source).not.toContain("replaceCatalogs");
  });

  it("retains the i18n runtime across serve-mode hot updates", () => {
    const rootDir = createFixtureProject({
      viewSource: [
        "template:",
        "  - 'div#root': ${i18n.common.title}",
        "",
      ].join("\n"),
    });
    createdDirs.push(rootDir);
    const i18nDir = path.join(rootDir, "src", "i18n");
    mkdirSync(i18nDir, { recursive: true });
    writeFileSync(path.join(i18nDir, "en.yaml"), "common:\n  title: Hello\n");
    writeFileSync(path.join(i18nDir, "vi.yaml"), "common:\n  title: Xin chao\n");

    const source = generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      command: "serve",
      i18n: {
        dir: "src/i18n",
        defaultLocale: "en",
        fallbackLocale: "en",
        locales: ["en", "vi"],
      },
    });

    expect(source).toContain(
      "import.meta.hot?.data.__rtglI18nRuntime || createI18nRuntime({",
    );
    expect(source).toContain(
      "const __rtglCommitI18nUpdate = () => {",
    );
    expect(source).toContain(
      '__rtglI18nCatalogs = {"en":{"common":{"title":"Hello"}},"vi":{"common":{"title":"Xin chao"}}};',
    );
    expect(source).toContain(
      "__rtglI18nRuntime.replaceCatalogs(__rtglI18nCatalogs);",
    );
    expect(source).toContain(
      "import.meta.hot.data.__rtglI18nRuntime = __rtglI18nRuntime;",
    );
    expect(source).toContain(
      "import.meta.hot.data.__rtglI18nCatalogFingerprint =",
    );
    expect(source.indexOf("const __rtglBatchResult =")).toBeLessThan(
      source.indexOf("__rtglCommitI18nUpdate();"),
    );
  });

  it("does not commit catalogs when a multi-component HMR preflight fails", async () => {
    const rootDir = createFixtureProject({
      viewSource: [
        "template:",
        "  - 'div#root': ${i18n.common.title}",
        "",
      ].join("\n"),
    });
    createdDirs.push(rootDir);
    const labelDir = path.join(rootDir, "components", "label");
    mkdirSync(labelDir, { recursive: true });
    writeFileSync(
      path.join(labelDir, "label.schema.yaml"),
      "componentName: x-label\n",
    );
    writeFileSync(
      path.join(labelDir, "label.view.yaml"),
      "template:\n  - 'span#root': Label\n",
    );
    const i18nDir = path.join(rootDir, "src", "i18n");
    mkdirSync(i18nDir, { recursive: true });
    writeFileSync(path.join(i18nDir, "en.yaml"), "common:\n  title: Hello\n");
    writeFileSync(path.join(i18nDir, "vi.yaml"), "common:\n  title: Xin chao\n");

    const source = generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      command: "serve",
      i18n: {
        dir: "src/i18n",
        defaultLocale: "en",
        fallbackLocale: "en",
        locales: ["en", "vi"],
      },
    });
    const i18nRuntime = {
      locale: {},
      ready: vi.fn(async () => {}),
      replaceCatalogs: vi.fn(),
    };
    const createI18nRuntime = vi.fn(() => i18nRuntime);
    const defineOrUpdateComponents = vi.fn(() => ({
      status: "incompatible",
      reason: "component-preflight-failed",
      message: "component B failed preflight",
      results: [],
    }));
    let acceptUpdate;
    const hot = {
      data: {
        __rtglInitialized: "previously-initialized",
        __rtglI18nRuntime: i18nRuntime,
        __rtglI18nCatalogFingerprint: "previous-catalog-fingerprint",
      },
      accept: vi.fn((callback) => {
        acceptUpdate = callback;
      }),
      invalidate: vi.fn(),
    };

    const nextModule = await executeServeSource({
      source,
      createI18nRuntime,
      defineOrUpdateComponents,
      deps: { components: {} },
      hot,
    });

    expect(defineOrUpdateComponents).toHaveBeenCalledTimes(1);
    expect(
      defineOrUpdateComponents.mock.calls[0][0].components.map(
        ({ componentId }) => componentId,
      ),
    ).toEqual(["components/counter", "components/label"]);
    expect(i18nRuntime.ready).toHaveBeenCalledTimes(1);
    expect(i18nRuntime.replaceCatalogs).not.toHaveBeenCalled();
    expect(createI18nRuntime).not.toHaveBeenCalled();
    expect(hot.data.__rtglI18nRuntime).toBe(i18nRuntime);
    expect(hot.data.__rtglI18nCatalogFingerprint).toBe(
      "previous-catalog-fingerprint",
    );
    expect(hot.data.__rtglInitialized).toBe("previously-initialized");
    expect(nextModule.__rtglHmrState).toEqual({
      incompatibleReason: "component B failed preflight",
    });

    acceptUpdate(nextModule);
    expect(hot.invalidate).toHaveBeenCalledWith(
      "[Rettangoli HMR] component B failed preflight",
    );
  });

  it("uses provided error prefix for invalid constants root", () => {
    const rootDir = createFixtureProject({
      constantsSource: "- bad\n",
    });
    createdDirs.push(rootDir);

    expect(() =>
      generateFrontendEntrySource({
        cwd: rootDir,
        dirs: ["components"],
        setup: "setup.js",
        command: "build",
        errorPrefix: "[Watch]",
      }),
    ).toThrow("[Watch]");
  });

  it("uses provided error prefix for contract validation failures", () => {
    const rootDir = createFixtureProject({
      includeSchema: false,
    });
    createdDirs.push(rootDir);

    expect(() =>
      generateFrontendEntrySource({
        cwd: rootDir,
        dirs: ["components"],
        setup: "setup.js",
        command: "build",
        errorPrefix: "[Watch]",
      }),
    ).toThrow("[Watch] Component contract validation failed:");
  });
});
