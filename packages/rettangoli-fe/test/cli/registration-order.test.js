import path from "node:path";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { generateFrontendEntrySource } from "../../src/cli/frontendEntrySource.js";
import {
  collectTemplateTags,
  orderParentsFirst,
} from "../../src/cli/registrationOrder.js";

const tempDirs = [];

afterEach(() => {
  tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

const writeComponent = (rootDir, category, component, { name, template }) => {
  const dir = path.join(rootDir, category, component);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${component}.schema.yaml`), `componentName: ${name}\n`);
  writeFileSync(path.join(dir, `${component}.view.yaml`), `template:\n${template}`);
};

describe("collectTemplateTags", () => {
  it("collects element tags through control keys, ids, classes and attributes", () => {
    const tags = collectTemplateTags([
      { "rtgl-view#root.box d=h": [
        { "$if open": [{ "x-child :items=${items}": null }] },
        { "$else": [{ "x-other": "text" }] },
        { "$for item in items": [{ "li#item-${item.id}": "${item.label}" }] },
      ] },
      "plain text",
    ]);
    expect([...tags].sort()).toEqual(["li", "rtgl-view", "x-child", "x-other"]);
  });

  it("ignores tags that are interpolated", () => {
    expect([...collectTemplateTags([{ "${tag} a=b": null }])]).toEqual([]);
  });
});

describe("orderParentsFirst", () => {
  it("puts every parent before the components it renders", () => {
    const order = orderParentsFirst([
      { id: "components/avatar", elementName: "x-avatar", tags: ["img"] },
      { id: "components/header", elementName: "x-header", tags: ["x-avatar"] },
      { id: "pages/app", elementName: "x-app", tags: ["x-home", "x-header"] },
      { id: "pages/home", elementName: "x-home", tags: ["x-header", "x-avatar"] },
    ]);
    expect(order).toEqual([
      "pages/app",
      "pages/home",
      "components/header",
      "components/avatar",
    ]);
  });

  it("keeps the default order for components that don't render each other", () => {
    const entries = ["a", "b", "c"].map((name) => ({
      id: name,
      elementName: `x-${name}`,
      tags: ["div"],
    }));
    expect(orderParentsFirst(entries)).toEqual(["a", "b", "c"]);
  });

  it("places components in a cycle after the rest, in default order", () => {
    const order = orderParentsFirst([
      { id: "a", elementName: "x-a", tags: ["x-b"] },
      { id: "b", elementName: "x-b", tags: ["x-a"] },
      { id: "c", elementName: "x-c", tags: [] },
      { id: "d", elementName: "x-d", tags: ["x-d"] },
    ]);
    expect(order).toEqual(["c", "d", "a", "b"]);
  });
});

describe("generated registration", () => {
  const createProject = () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-order-"));
    tempDirs.push(rootDir);
    writeFileSync(path.join(rootDir, "setup.js"), "export const deps = {};\n");
    writeComponent(rootDir, "components", "badge", {
      name: "x-badge",
      template: "  - span: badge\n",
    });
    writeComponent(rootDir, "pages", "home", {
      name: "x-home",
      template: "  - div:\n      - x-badge: null\n",
    });
    return rootDir;
  };

  const readOrder = (source, name) =>
    JSON.parse(source.match(new RegExp(`const ${name} = (\\[.*\\]);`))[1]);

  it("emits the default order and a parents-first order for server markup", () => {
    const rootDir = createProject();
    const source = generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["components", "pages"],
      setup: "setup.js",
    });

    expect(readOrder(source, "__rtglRegistrationOrder")).toEqual([
      ["components", "badge"],
      ["pages", "home"],
    ]);
    expect(readOrder(source, "__rtglHydrationRegistrationOrder")).toEqual([
      ["pages", "home"],
      ["components", "badge"],
    ]);
    expect(source).toContain('document.querySelector("[data-rtgl-hydrate]")');
  });
});
