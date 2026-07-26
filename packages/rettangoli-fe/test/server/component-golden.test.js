/**
 * HTML goldens for REAL components.
 *
 * This is the payoff of the Node-renderable work. Before it, the only way to
 * see what a component produced was a Docker-pinned Playwright screenshot diff
 * — which cannot localise a regression, cannot run in a unit suite, and cannot
 * distinguish "rendered correctly" from "wiped and re-rendered to the same
 * pixels". The repo had 1,301 `.webp` references and zero `.html` goldens.
 *
 * These render the shipped e2e fixtures through the real pipeline
 * (resolveComponentDefinition -> bindStore -> parseView -> serializeVNode) in
 * bare Node, and diff against committed markup. A change to the parser, the
 * store binding, or the serializer shows up here as a readable text diff.
 *
 * Regenerate after an intended change:
 *   UPDATE_GOLDENS=1 npx vitest run packages/rettangoli-fe/test/server/component-golden.test.js
 */

import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { h } from "snabbdom/build/h.js";
import jemplParse from "jempl/src/parse/index.js";

import { serializeVNode } from "../../src/core/server/serializeVNode.js";
import { parseView } from "../../src/parser.js";
import { bindStore } from "../../src/core/runtime/store.js";
import { resolveComponentDefinition } from "../../src/core/component/resolveComponentDefinition.js";

const PKG = path.resolve(import.meta.dirname, "../..");
const GOLDEN_DIR = path.join(import.meta.dirname, "__goldens__");
const UPDATE = process.env.UPDATE_GOLDENS === "1";

/** Loads a real four-file component from an e2e fixture directory. */
const loadComponent = async (suite, name) => {
  const dir = path.join(PKG, "e2e", suite, "fe/components");
  const read = (ext) => {
    const file = path.join(dir, `${name}.${ext}`);
    return existsSync(file) ? readFileSync(file, "utf8") : null;
  };

  const viewSource = read("view.yaml");
  const schemaSource = read("schema.yaml");
  const storeModule = existsSync(path.join(dir, `${name}.store.js`))
    ? await import(path.join(dir, `${name}.store.js`))
    : {};

  return {
    view: yaml.load(viewSource),
    schema: yaml.load(schemaSource),
    store: storeModule,
  };
};

/**
 * The full server render path. Handlers are deliberately never invoked — this
 * is the component's initial state, which is exactly what a server can know.
 */
const renderToHtml = ({ view, schema, store }, { props = {}, mutate } = {}) => {
  const definition = resolveComponentDefinition({
    view,
    schema,
    store,
    handlers: {},
    methods: {},
    constants: {},
  });

  const bound = bindStore(store, props, {}, {});
  // Drive the store through real actions so goldens can cover branches that
  // only appear after state changes ($if / $for with data).
  if (mutate) mutate(bound);

  const vdom = parseView({
    h,
    template: jemplParse(JSON.parse(JSON.stringify(definition.template))),
    viewData: bound.selectViewData ? bound.selectViewData() : {},
    refs: definition.refs || {},
    handlers: {},
  });

  return serializeVNode(vdom);
};

/** Cheap readability: one tag per line, so diffs point at a single element. */
const pretty = (html) => html.replace(/></g, ">\n<");

const assertGolden = (name, html) => {
  if (!existsSync(GOLDEN_DIR)) mkdirSync(GOLDEN_DIR, { recursive: true });
  const file = path.join(GOLDEN_DIR, `${name}.html`);
  const actual = `${pretty(html)}\n`;

  if (UPDATE || !existsSync(file)) {
    writeFileSync(file, actual);
    return;
  }
  expect(actual, `golden mismatch for ${name}`).toBe(readFileSync(file, "utf8"));
};

describe("HTML goldens for real components", () => {
  it("renders counter at its initial state", async () => {
    const component = await loadComponent("interactions", "counter");
    const html = renderToHtml(component);
    assertGolden("counter-initial", html);

    // Anchors that make the golden meaningful rather than just stable.
    expect(html).toContain("Count: 0");
    expect(html).toContain('data-testid="counter-bar"');
    // `$if showPanel` is false at rest, so the panel must be absent.
    expect(html).not.toContain('data-testid="panel"');
  });

  it("renders counter after real store actions, exercising $if and interpolation", async () => {
    const component = await loadComponent("interactions", "counter");
    const html = renderToHtml(component, {
      mutate: (store) => {
        store.increment();
        store.increment();
        store.increment();
        store.togglePanel();
      },
    });
    assertGolden("counter-mutated", html);

    expect(html).toContain("Count: 3");
    // barHeight = min(3 * 20, 200)
    expect(html).toContain("height:60px");
    expect(html).toContain('data-testid="panel"');
  });

  it("renders itemList, exercising $for over store data", async () => {
    const component = await loadComponent("interactions", "itemList");
    const html = renderToHtml(component);
    assertGolden("itemList-initial", html);
    expect(html.startsWith("<div")).toBe(true);
  });

  it("produces byte-identical output across repeated renders", async () => {
    const component = await loadComponent("interactions", "counter");
    const once = renderToHtml(component);
    const twice = renderToHtml(component);
    expect(once).toBe(twice);
  });

  it("never leaks props, listeners or hooks into the markup", async () => {
    const component = await loadComponent("interactions", "counter");
    const html = renderToHtml(component);
    expect(html).not.toContain("[object Object]");
    expect(html).not.toContain("function");
    expect(html).not.toMatch(/\son[a-z]+="/);
  });
});
