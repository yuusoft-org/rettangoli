import path from "node:path";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

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
