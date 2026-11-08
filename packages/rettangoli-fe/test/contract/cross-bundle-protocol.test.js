/**
 * Pins the wire protocol between separately bundled copies of the fe runtime.
 *
 * The ui IIFE embeds its own fe runtime, and older ui versions (1.23.0, 1.30.1,
 * nested inside check and rtgl) meet newer app runtimes in the same page. They
 * recognise each other only through `Symbol.for` keys, duck-typed fields and
 * attribute names, never through shared module instances. Renaming any of
 * these breaks mixed-version pages without a build error.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { PARENT_UPDATE_TRANSACTION } from "../../src/core/runtime/updateTransaction.js";
import { bindStore } from "../../src/core/runtime/store.js";
import { generateFrontendEntrySource } from "../../src/cli/frontendEntrySource.js";
import { renderComponent } from "../../src/server/index.js";
import {
  HYDRATE_ATTRIBUTE,
  SERVER_PROPS_ATTRIBUTE,
} from "../../src/web/hydration.js";
import {
  RETTANGOLI_COMPONENT_MARKER,
  isRettangoliComponent,
} from "../../src/web/componentUpdateHook.js";
import {
  RETTANGOLI_HOT_APPLY,
  RETTANGOLI_HOT_PREPARE,
} from "../../src/web/createWebComponentClass.js";

const SRC_DIR = path.resolve(import.meta.dirname, "../../src");
const DASHBOARD_DIR = path.resolve(import.meta.dirname, "../../e2e/dashboard");

const PROTOCOL_KEYS = [
  "@rettangoli/fe/component",
  "@rettangoli/fe/hot-apply",
  "@rettangoli/fe/hot-component-registry",
  "@rettangoli/fe/hot-prepare",
  "@rettangoli/fe/parent-update-transaction",
  "@rettangoli/fe/store-hot-update",
  "@rettangoli/fe/store-initialize",
];

const listSourceFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return entry.name.endsWith(".js") ? [fullPath] : [];
  });

describe("Symbol.for keys", () => {
  it("keeps the exported symbols on their registry keys", () => {
    expect(PARENT_UPDATE_TRANSACTION).toBe(Symbol.for("@rettangoli/fe/parent-update-transaction"));
    expect(RETTANGOLI_COMPONENT_MARKER).toBe(Symbol.for("@rettangoli/fe/component"));
    expect(RETTANGOLI_HOT_APPLY).toBe(Symbol.for("@rettangoli/fe/hot-apply"));
    expect(RETTANGOLI_HOT_PREPARE).toBe(Symbol.for("@rettangoli/fe/hot-prepare"));
  });

  it("keeps the store hot-update and initialize hooks under their keys, hidden from enumeration", () => {
    const createInitialState = vi.fn(() => ({ count: 1 }));
    const store = bindStore(
      { createInitialState, selectCount: ({ state }) => state.count, bump: ({ state }) => { state.count += 1; } },
      {},
      {},
      {},
      { deferInitialization: true },
    );
    const initialize = store[Symbol.for("@rettangoli/fe/store-initialize")];
    const hotUpdate = store[Symbol.for("@rettangoli/fe/store-hot-update")];

    expect(typeof initialize).toBe("function");
    expect(typeof hotUpdate).toBe("function");
    expect(Object.keys(store).sort()).toEqual(["bump", "getState", "selectCount"]);
    expect(Object.getOwnPropertySymbols(store).map((symbol) => symbol.description).sort()).toEqual([
      "@rettangoli/fe/store-hot-update",
      "@rettangoli/fe/store-initialize",
    ]);
    // Non-enumerable, so spreading or copying a store never carries the protocol hooks along.
    for (const key of ["@rettangoli/fe/store-hot-update", "@rettangoli/fe/store-initialize"]) {
      expect(Object.getOwnPropertyDescriptor(store, Symbol.for(key)).enumerable).toBe(false);
    }
    expect(Object.getOwnPropertySymbols({ ...store })).toEqual([]);

    expect(createInitialState).not.toHaveBeenCalled();
    initialize();
    initialize();
    expect(createInitialState).toHaveBeenCalledTimes(1);

    // A hot update swaps the definition and keeps the live state.
    store.bump();
    hotUpdate({
      store: { createInitialState: () => ({ count: 99 }), selectCount: ({ state }) => state.count * 10 },
      props: {},
      constants: {},
    });
    expect(store.selectCount()).toBe(20);
    expect(store.bump).toBeUndefined();
  });

  describe("hot component registry", () => {
    const registryKey = Symbol.for("@rettangoli/fe/hot-component-registry");

    afterEach(() => {
      delete globalThis[registryKey];
      vi.unstubAllGlobals();
    });

    it("lives on globalThis under its key, keyed by component id, with the record fields other bundles read", async () => {
      const defined = new Map();
      vi.stubGlobal("HTMLElement", class {});
      vi.stubGlobal("customElements", {
        get: (name) => defined.get(name),
        define: (name, componentClass) => defined.set(name, componentClass),
      });
      const { defineOrUpdateComponent } = await import("../../src/web/hotComponentRegistry.js");
      expect(globalThis[registryKey]).toBeUndefined();

      const result = defineOrUpdateComponent({
        componentId: "pages/x-hot-registry",
        componentConfig: {
          schema: { componentName: "x-hot-registry" },
          view: { template: [], refs: {}, styles: {} },
          store: {},
          handlers: {},
          methods: {},
        },
        deps: {},
        fingerprint: "fp-1",
      });

      expect(result.status).toBe("defined");
      const registry = globalThis[registryKey];
      expect(Object.keys(registry)).toEqual(["records"]);
      expect(registry.records).toBeInstanceOf(Map);
      const record = registry.records.get("pages/x-hot-registry");
      expect(Object.keys(record).sort()).toEqual([
        "componentClass",
        "componentId",
        "definition",
        "deps",
        "fingerprint",
        "instances",
        "revision",
      ]);
      expect(record.revision).toBe(1);
      expect(record.fingerprint).toBe("fp-1");
      expect(record.instances).toBeInstanceOf(Set);
      expect(record.componentClass).toBe(defined.get("x-hot-registry"));
      expect(Object.getOwnPropertyDescriptor(globalThis, registryKey)).toMatchObject({
        enumerable: false,
        writable: false,
        configurable: true,
      });
    });
  });

  it("uses no Symbol.for key in src outside the seven protocol keys", () => {
    const found = new Set();
    for (const file of listSourceFiles(SRC_DIR)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/Symbol\.for\(\s*["'`]([^"'`]+)["'`]/g)) {
        found.add(match[1]);
      }
    }
    expect([...found].sort()).toEqual(PROTOCOL_KEYS);
  });
});

describe("duck-typed component recognition", () => {
  const createDuckTyped = () => {
    const store = {};
    const props = {};
    const render = () => {};
    return {
      elementName: "x-duck",
      render,
      patch: () => {},
      _snabbdomH: () => {},
      store,
      props,
      deps: { render, store, props },
    };
  };

  it("accepts an object with the fields an older bundle installs", () => {
    expect(isRettangoliComponent(createDuckTyped())).toBe(true);
  });

  it("accepts the brand without the duck-typed fields", () => {
    expect(isRettangoliComponent({ [Symbol.for("@rettangoli/fe/component")]: true })).toBe(true);
    expect(isRettangoliComponent({ [Symbol.for("@rettangoli/fe/component")]: "yes" })).toBe(false);
  });

  it.each([
    ["deps.store differs", (element) => { element.deps.store = {}; }],
    ["deps.render differs", (element) => { element.deps.render = () => {}; }],
    ["deps.props differs", (element) => { element.deps.props = {}; }],
    ["elementName is not a string", (element) => { element.elementName = 1; }],
    ["render is missing", (element) => { delete element.render; }],
    ["patch is missing", (element) => { delete element.patch; }],
    ["_snabbdomH is missing", (element) => { delete element._snabbdomH; }],
    ["deps is missing", (element) => { delete element.deps; }],
  ])("rejects it when %s", (_label, mutate) => {
    const element = createDuckTyped();
    mutate(element);
    expect(isRettangoliComponent(element)).toBe(false);
  });

  it("rejects non-components without throwing", () => {
    expect(isRettangoliComponent(null)).toBe(false);
    expect(isRettangoliComponent(undefined)).toBe(false);
    expect(isRettangoliComponent({})).toBe(false);
    expect(isRettangoliComponent("x-duck")).toBe(false);
    expect(isRettangoliComponent(new Proxy({}, { get() { throw new Error("boom"); } }))).toBe(false);
  });
});

describe("server rendering markers", () => {
  it("keeps the attribute names the browser runtime adopts", () => {
    expect(HYDRATE_ATTRIBUTE).toBe("data-rtgl-hydrate");
    expect(SERVER_PROPS_ATTRIBUTE).toBe("data-rtgl-props");
  });

  it("writes the hydrate marker, the props script and the render target for a one-component fixture", () => {
    const { head, html } = renderComponent({
      component: "x-marker",
      components: [{
        schema: { componentName: "x-marker", propsSchema: { type: "object", properties: { label: {} } } },
        view: { template: [{ p: "${label}" }], refs: {}, styles: {} },
        store: { selectViewData: ({ props }) => ({ label: props.label }) },
        handlers: {},
        methods: {},
      }],
      props: { label: "hi" },
      serializeProps: true,
    });

    expect(head).toBe("");
    expect(html).toContain(`<x-marker ${HYDRATE_ATTRIBUTE}="" ${SERVER_PROPS_ATTRIBUTE}="">`);
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain('<div data-rtgl-render-target="" style="display: contents"><p>hi</p></div></template>');
    expect(html).toContain(`<script type="application/json" ${SERVER_PROPS_ATTRIBUTE}="">{"label":"hi"}</script>`);
  });
});

describe("generated entry source", () => {
  it.each(["build", "serve"])("keeps the literal [data-rtgl-hydrate] probe in the %s entry", (command) => {
    const source = generateFrontendEntrySource({
      cwd: DASHBOARD_DIR,
      dirs: ["fe/components"],
      setup: "fe/setup.js",
      command,
    });
    expect(source).toContain('document.querySelector("[data-rtgl-hydrate]") !== null');
  });
});
