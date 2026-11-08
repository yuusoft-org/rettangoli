import path from "node:path";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadComponents, renderComponent } from "../../src/server/index.js";

const tempDirs = [];

afterEach(() => {
  tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

const writeFiles = (rootDir, files) => {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(rootDir, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
};

const createProject = (files) => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-load-"));
  tempDirs.push(rootDir);
  writeFiles(rootDir, files);
  return rootDir;
};

describe("loadComponents", () => {
  it("loads views, schemas, constants, stores and methods, never handlers", async () => {
    const rootDir = createProject({
      "src/pages/home/home.schema.yaml": [
        "componentName: x-home",
        "propsSchema:",
        "  type: object",
        "  properties:",
        "    name: {}",
        "methods:",
        "  type: object",
        "  properties:",
        "    focus: {}",
      ].join("\n"),
      "src/pages/home/home.view.yaml": "template:\n  - h1: ${greeting}\n  - x-badge: null\n",
      "src/pages/home/home.constants.yaml": "prefix: Hello\n",
      "src/pages/home/home.store.js":
        "export const selectViewData = ({ props, constants }) => ({ greeting: `${constants.prefix} ${props.name}` });\n",
      "src/pages/home/home.methods.js": "export function focus() {}\n",
      // Handlers may use browser APIs: they are never imported.
      "src/pages/home/home.handlers.js": "window.alert('imported');\n",
      "src/components/badge/badge.schema.yaml": "componentName: x-badge\n",
      "src/components/badge/badge.view.yaml": "template:\n  - span: badge\n",
    });

    const components = await loadComponents({
      cwd: rootDir,
      dirs: ["src/components", "src/pages"],
    });

    expect(components.map((c) => c.schema.componentName).sort()).toEqual(["x-badge", "x-home"]);
    const home = components.find((c) => c.schema.componentName === "x-home");
    expect(home.handlers).toBeUndefined();
    expect(typeof home.methods.focus).toBe("function");
    expect(typeof home.view.template.type).toBe("number");

    const { html } = renderComponent({
      component: "x-home",
      components,
      props: { name: "Ada" },
    });
    expect(html).toContain("<h1>Hello Ada</h1>");
    expect(html).toContain("<span>badge</span>");
  });

  it("doesn't import the modules of a component marked ssr: false", async () => {
    const rootDir = createProject({
      "src/components/canvas/canvas.schema.yaml": [
        "componentName: x-canvas",
        "ssr: false",
        "methods:",
        "  type: object",
        "  properties:",
        "    draw: {}",
      ].join("\n"),
      "src/components/canvas/canvas.view.yaml": "template:\n  - canvas: null\n",
      "src/components/canvas/canvas.store.js": "document.createElement('canvas');\n",
      "src/components/canvas/canvas.methods.js": "export function draw() { window.x = 1; }\n",
    });

    const [canvas] = await loadComponents({ cwd: rootDir, dirs: ["src/components"] });

    expect(canvas.store).toBeUndefined();
    expect(() => canvas.methods.draw()).toThrow(/not available while prerendering/);
    expect(renderComponent({ component: "x-canvas", components: [canvas] }).html)
      .toBe("<x-canvas></x-canvas>");
  });

  it("says which store can't be imported in Node", async () => {
    const rootDir = createProject({
      "src/components/broken/broken.schema.yaml": "componentName: x-broken\n",
      "src/components/broken/broken.view.yaml": "template:\n  - p: x\n",
      "src/components/broken/broken.store.js": "const width = window.innerWidth;\nexport const selectViewData = () => ({ width });\n",
    });

    await expect(loadComponents({ cwd: rootDir, dirs: ["src/components"] }))
      .rejects.toThrow(/broken\.store\.js can't be imported in Node .*ssr: false/);
  });

  it("requires directories that exist", async () => {
    await expect(loadComponents({ dirs: [] })).rejects.toThrow(/non-empty array/);
    await expect(loadComponents({ cwd: tmpdir(), dirs: ["no-such-dir-rtgl"] }))
      .rejects.toThrow(/does not exist/);
  });

  it("finds components in nested directories, as the build does", async () => {
    const rootDir = createProject({
      "src/components/forms/field/field.schema.yaml": "componentName: x-field\n",
      "src/components/forms/field/field.view.yaml": "template:\n  - label: field\n",
      "src/components/badge/badge.schema.yaml": "componentName: x-badge\n",
      "src/components/badge/badge.view.yaml": "template:\n  - span: badge\n",
    });
    const components = await loadComponents({ cwd: rootDir, dirs: ["src/components"] });
    expect(components.map((c) => c.schema.componentName).sort()).toEqual(["x-badge", "x-field"]);
  });

  it.each([
    ["no componentName", { "c/a/a.schema.yaml": "description: none\n", "c/a/a.view.yaml": "template: []\n" }, /c\/a has no schema\.componentName/],
    ["no view", { "c/a/a.schema.yaml": "componentName: x-a\n" }, /c\/a has no \.view\.yaml/],
    ["YAML that doesn't parse", { "c/a/a.schema.yaml": "componentName: [x-a\n", "c/a/a.view.yaml": "template: []\n" }, /failed to parse .*a\.schema\.yaml/],
  ])("says which component has %s", async (_label, files, message) => {
    const rootDir = createProject(files);
    await expect(loadComponents({ cwd: rootDir, dirs: ["c"] })).rejects.toThrow(message);
  });

  it("imports edited stores again for a new reload token", async () => {
    const rootDir = createProject({
      "c/card/card.schema.yaml": "componentName: x-card\n",
      "c/card/card.view.yaml": "template:\n  - p: ${text}\n",
      "c/card/card.store.js": "export const selectViewData = () => ({ text: 'first' });\n",
    });
    const render = (components) =>
      renderComponent({ component: "x-card", components }).html;
    const first = await loadComponents({ cwd: rootDir, dirs: ["c"], reload: "1" });
    writeFileSync(
      path.join(rootDir, "c/card/card.store.js"),
      "export const selectViewData = () => ({ text: 'second' });\n",
    );
    const cached = await loadComponents({ cwd: rootDir, dirs: ["c"], reload: "1" });
    const reloaded = await loadComponents({ cwd: rootDir, dirs: ["c"], reload: "2" });
    expect(render(first)).toContain("<p>first</p>");
    expect(render(cached)).toContain("<p>first</p>");
    expect(render(reloaded)).toContain("<p>second</p>");
  });

  it("keeps the server entry free of Node built-ins at module scope", () => {
    const serverDir = path.join(import.meta.dirname, "../../src/server");
    for (const file of readdirSync(serverDir)) {
      const source = readFileSync(path.join(serverDir, file), "utf8");
      expect(source, file).not.toMatch(/^import [^;]* from "node:/m);
    }
  });
});

describe("loadComponents output for a real app", () => {
  const PKG = path.resolve(import.meta.dirname, "../..");
  const GOLDEN_PATH = path.join(import.meta.dirname, "../cli/__goldens__/load-components-dashboard.json");

  // One line per section of each component, so a diff names what changed.
  // Functions become "fn"; store and methods modules become their export names.
  const snapshot = (components) => {
    const replacer = (_key, value) => (typeof value === "function" ? "fn" : value);
    const blocks = components.map((component) => {
      const lines = Object.entries(component).map(
        ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value, replacer)}`,
      );
      return `{\n${lines.join(",\n")}\n}`;
    });
    return `[\n${blocks.join(",\n")}\n]\n`;
  };

  it("matches the committed snapshot for e2e/dashboard", async () => {
    const components = await loadComponents({
      cwd: path.join(PKG, "e2e/dashboard"),
      dirs: ["fe/components"],
    });
    const actual = snapshot(components);
    if (process.env.UPDATE_GOLDENS === "1") {
      mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
      writeFileSync(GOLDEN_PATH, actual);
      return;
    }
    expect(existsSync(GOLDEN_PATH), "missing golden; run with UPDATE_GOLDENS=1").toBe(true);
    expect(actual).toBe(readFileSync(GOLDEN_PATH, "utf8"));
    expect(JSON.parse(actual).map((component) => component.schema.componentName)).toEqual([
      "e2e-dashboard",
      "e2e-kanban",
      "e2e-pixel-grid",
      "e2e-stepper",
    ]);
  });

  it("returns the sections it loads for a component, in a stable key order", async () => {
    const components = await loadComponents({
      cwd: path.join(PKG, "e2e/dashboard"),
      dirs: ["fe/components"],
    });
    expect(components.map((component) => Object.keys(component))).toEqual([
      ["view", "schema", "constants", "store"],
      ["view", "schema", "store"],
      ["view", "schema", "store"],
      ["view", "schema", "store"],
    ]);
  });
});

describe("loadComponents messages for files that do not parse", () => {
  const load = async (files) => {
    const rootDir = createProject({
      "c/a/a.schema.yaml": "componentName: x-a\n",
      "c/a/a.view.yaml": "template:\n  - p: x\n",
      ...files,
    });
    try {
      await loadComponents({ cwd: rootDir, dirs: ["c"] });
    } catch (error) {
      return error.message.replaceAll(rootDir, "<ROOT>");
    }
    throw new Error("expected loadComponents to throw");
  };

  it("names the view file and carries js-yaml's message", async () => {
    expect(await load({ "c/a/a.view.yaml": "template: [unclosed\n" })).toBe(
      "[loadComponents] failed to parse <ROOT>/c/a/a.view.yaml: "
      + "unexpected end of the stream within a flow collection (2:1)\n\n"
      + " 1 | template: [unclosed\n"
      + " 2 | \n"
      + "-----^",
    );
  });

  it("names the schema file and carries js-yaml's message", async () => {
    expect(await load({ "c/a/a.schema.yaml": "componentName: [x-a\n" })).toBe(
      "[loadComponents] failed to parse <ROOT>/c/a/a.schema.yaml: "
      + "unexpected end of the stream within a flow collection (2:1)\n\n"
      + " 1 | componentName: [x-a\n"
      + " 2 | \n"
      + "-----^",
    );
  });

  it("names the view file when the template is invalid", async () => {
    expect(await load({ "c/a/a.view.yaml": "template:\n  - $for x: []\n" })).toBe(
      "[loadComponents] error parsing template in <ROOT>/c/a/a.view.yaml: "
      + "Parse Error: Invalid loop syntax - missing 'in' keyword (got: '$for x')",
    );
  });
});

describe("loadComponents reads YAML the way the browser entry embeds it", () => {
  const files = {
    "setup.js": "export const deps = {};\n",
    "c/card/card.schema.yaml": "componentName: x-card\n",
    "c/card/card.view.yaml": "template:\n  - p#date: 2024-01-02\n  - p#nan: .nan\n  - p#inf: -.inf\n  - p: ${released}\n",
    "c/card/card.constants.yaml": "released: 2024-01-02\nratio: .nan\nlimit: .inf\nlabel: plain\n",
  };

  it("turns dates into ISO strings and NaN or Infinity into null", async () => {
    const rootDir = createProject(files);
    const [card] = await loadComponents({ cwd: rootDir, dirs: ["c"] });
    expect(card.constants).toEqual({
      released: "2024-01-02T00:00:00.000Z",
      ratio: null,
      limit: null,
      label: "plain",
    });
    const literal = (index) => card.view.template.items[index].properties[0].value;
    expect(literal(1)).toStrictEqual({ type: 0, value: null });
    expect(literal(2)).toStrictEqual({ type: 0, value: null });
  });

  it("matches the view, schema and constants in the generated build entry", async () => {
    const { generateFrontendEntrySource } = await import("../../src/cli/frontendEntrySource.js");
    const rootDir = createProject(files);
    const [card] = await loadComponents({ cwd: rootDir, dirs: ["c"] });
    const source = generateFrontendEntrySource({ cwd: rootDir, dirs: ["c"], setup: "setup.js", command: "build" });
    const embedded = (fileType) => JSON.parse(source.match(new RegExp(`^const __rtgl_\\d+_${fileType} = (.*);$`, "m"))[1]);
    expect(card.view).toStrictEqual(embedded("view"));
    expect(card.constants).toStrictEqual(embedded("constants"));
    expect(card.schema).toStrictEqual(embedded("schema"));
  });

  it("warns once when two folders define one component id", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const rootDir = createProject({
        "src/components/button/button.schema.yaml": "componentName: app-button\n",
        "src/components/button/button.view.yaml": "template:\n  - button: app\n",
        "vendor/components/button/button.schema.yaml": "componentName: vendor-button\n",
        "vendor/components/button/button.view.yaml": "template:\n  - button: vendor\n",
      });
      const components = await loadComponents({ cwd: rootDir, dirs: ["src", "vendor"] });
      expect(components.map((component) => component.schema.componentName)).toEqual(["vendor-button"]);
      expect(warn.mock.calls).toEqual([[
        `[loadComponents] component id "components/button" is defined in ${path.join(rootDir, "src/components/button/button")}`
        + ` and ${path.join(rootDir, "vendor/components/button/button")}; their files are merged and later files win.`,
      ]]);
    } finally {
      warn.mockRestore();
    }
  });
});
