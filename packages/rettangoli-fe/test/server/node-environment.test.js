/**
 * Guards the property that makes every Node-side tool possible: this package
 * must be importable without a DOM.
 *
 * This regressed silently for a long time because nothing asserted it. The
 * cause was subtle — snabbdom's style module dereferences a bare `window` at
 * MODULE scope, so the failure was at import, not at call, and no amount of
 * lazy instantiation would have fixed it.
 */

import { describe, expect, it } from "vitest";

describe("node environment", () => {
  it("runs these tests without a DOM", () => {
    expect(typeof globalThis.document).toBe("undefined");
    expect(typeof globalThis.window).toBe("undefined");
    expect(typeof globalThis.HTMLElement).toBe("undefined");
  });

  it("imports the package entry without a DOM", async () => {
    const mod = await import("../../src/index.js");
    expect(typeof mod.createComponent).toBe("function");
    expect(typeof mod.createI18nRuntime).toBe("function");
  });

  it("imports the server entry without a DOM", async () => {
    const mod = await import("../../src/server/index.js");
    expect(typeof mod.renderView).toBe("function");
    expect(typeof mod.serializeVNode).toBe("function");
    expect(typeof mod.bindStore).toBe("function");
    expect(typeof mod.resolveComponentDefinition).toBe("function");
  });

  it("imports the web binding without a DOM (constructing still needs one)", async () => {
    // Importing must not throw; only *calling* the factory requires HTMLElement.
    const mod = await import("../../src/web/createWebComponentClass.js");
    expect(typeof mod.createWebComponentClass).toBe("function");
  });

  it("builds the snabbdom patch without a DOM", async () => {
    const createWebPatch = (await import("../../src/createWebPatch.js")).default;
    expect(typeof createWebPatch()).toBe("function");
  });

  it("resolves a component definition without a DOM", async () => {
    const { resolveComponentDefinition } = await import(
      "../../src/core/component/resolveComponentDefinition.js"
    );
    const definition = resolveComponentDefinition({
      schema: { componentName: "x-a", propsSchema: { properties: { fooBar: { type: "string" } } } },
      view: { template: [], refs: {}, styles: {} },
      store: {},
      handlers: {},
      methods: {},
    });
    expect(definition.elementName).toBe("x-a");
    expect(definition.propsSchemaKeys).toEqual(["fooBar"]);
  });

  it("still exposes resolveComponentDefinition from its original module", async () => {
    const mod = await import("../../src/createComponent.js");
    expect(typeof mod.resolveComponentDefinition).toBe("function");
  });
});

describe("package exports map", () => {
  // Resolving through the bare specifier is what consumers actually do, and it
  // is what stops them reaching into node_modules by path — the hazard that let
  // a consumer bind a different jempl version than it hoisted.
  it.each([
    ["@rettangoli/fe", ["createComponent"]],
    ["@rettangoli/fe/server", ["renderView", "serializeVNode", "bindStore"]],
    ["@rettangoli/fe/contracts", []],
  ])("resolves %s", async (specifier, expectedExports) => {
    const mod = await import(specifier);
    for (const name of expectedExports) {
      expect(typeof mod[name], `${specifier} should export ${name}`).toBe("function");
    }
  });

  it("does not expose arbitrary internal paths", async () => {
    // Asserted in a real Node process: Vite resolves bare specifiers at
    // transform time, so an unexported subpath fails the whole module here
    // rather than rejecting at runtime.
    const { execFileSync } = await import("node:child_process");
    const script =
      "import('@rettangoli/fe/src/parser.js')" +
      ".then(() => { console.log('RESOLVED'); })" +
      ".catch((e) => { console.log(e.code); });";
    const out = execFileSync(process.execPath, ["-e", script], {
      cwd: new URL("../../", import.meta.url).pathname,
      encoding: "utf8",
    }).trim();
    expect(out).toBe("ERR_PACKAGE_PATH_NOT_EXPORTED");
  });
});

describe("end to end: a component renders to HTML in bare Node", () => {
  it("renders a component with ONLY what ./server exports — no extra deps", async () => {
    // The point of renderView: a consumer needs neither snabbdom's `h` nor
    // jempl's parser, both of which live behind deep internal paths.
    const { renderView, bindStore } = await import("../../src/server/index.js");

    const store = {
      createInitialState: () => ({ count: 3 }),
      selectViewData: ({ state, props }) => ({ name: props.name, count: state.count }),
    };
    const bound = bindStore(store, { name: "Ada" }, {}, {});

    const html = renderView({
      template: [{ "div.card": [{ "h1#title": "${name}" }, { p: "count=${count}" }] }],
      viewData: bound.selectViewData(),
    });

    expect(html).toBe(
      '<div style="display: contents"><div class="card"><h1 id="title">Ada</h1><p>count=3</p></div></div>',
    );
  });

  it("accepts an already-parsed jempl AST, as produced at build time", async () => {
    const { renderView } = await import("../../src/server/index.js");
    const jemplParse = (await import("jempl/src/parse/index.js")).default;
    expect(renderView({ template: jemplParse([{ p: "${x}" }]), viewData: { x: "ok" } }))
      .toBe('<div style="display: contents"><p>ok</p></div>');
  });

  it("is deterministic across repeated renders", async () => {
    const { renderView } = await import("../../src/server/index.js");
    const render = () =>
      renderView({ template: [{ "div#root": ["${a}", { span: "${b}" }] }], viewData: { a: "x", b: "y" } });
    expect(render()).toBe(render());
  });
});
