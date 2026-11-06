// @vitest-environment jsdom
/**
 * Records the `deps` object each kind of handler receives today: its keys and
 * how it relates to `el.deps`, `el._runtimeDeps` and `el.refIds`. Apps destructure
 * these (`{ store, render, refs, dispatchEvent, props, constants, ...setupDeps }`),
 * so a change to the deps plumbing has to leave every line below unchanged.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "jempl";
import createComponent from "../../src/createComponent.js";
import { createI18nRuntime } from "../../src/core/runtime/i18n.js";

let componentNumber = 0;
let frames;

const flushFrames = () => {
  frames.splice(0).forEach((callback) => callback());
};

const RUNTIME_DEP_KEYS = [
  "authService",
  "constants",
  "dispatchEvent",
  "handlers",
  "locale",
  "props",
  "refs",
  "render",
  "store",
];

const createFixture = ({ setupDeps = {}, constants = {} } = {}) => {
  const id = componentNumber++;
  const childName = `x-deps-child-${id}`;
  const parentName = `x-deps-parent-${id}`;
  const authService = { name: "auth" };
  const seen = {};
  // refs is one shared object that fills in after the first render, so record its keys now.
  const record = (name) => vi.fn((deps, payload) => {
    seen[name] = { deps, payload, refKeys: Object.keys(deps.refs) };
  });
  const handlers = {
    handleBeforeMount: record("beforeMount"),
    handleAfterMount: record("afterMount"),
    handleClick: record("click"),
    handleOnUpdate: record("onUpdate"),
  };
  const methodCalls = [];

  const deps = { authService, ...setupDeps };
  customElements.define(childName, createComponent({
    schema: {
      componentName: childName,
      propsSchema: { type: "object", properties: { heading: {} } },
      methods: { type: "object", properties: { focusInput: {} } },
    },
    view: {
      template: parse([{ "button#saveButton": "Save" }]),
      refs: { saveButton: { eventListeners: { click: { handler: "handleClick" } } } },
      styles: {},
    },
    store: {},
    constants,
    handlers,
    methods: {
      focusInput(...args) {
        methodCalls.push({ self: this, args });
        return "focused";
      },
    },
  }, deps));

  customElements.define(parentName, createComponent({
    schema: {
      componentName: parentName,
      propsSchema: { type: "object", properties: {} },
    },
    view: {
      template: parse([{ [`${childName} :heading=\${heading}`]: "" }]),
      refs: {},
      styles: {},
    },
    store: {
      createInitialState: () => ({ heading: "first" }),
      selectViewData: ({ state }) => ({ heading: state.heading }),
      setHeading: ({ state }, payload) => {
        state.heading = payload.heading;
      },
    },
    handlers: {},
  }, {}));

  const mountStandalone = () => document.body.appendChild(document.createElement(childName));
  const mountUnderParent = () => {
    const parent = document.body.appendChild(document.createElement(parentName));
    return { parent, child: parent.renderTarget.firstElementChild };
  };
  return {
    authService,
    handlers,
    methodCalls,
    mountStandalone,
    mountUnderParent,
    seen,
  };
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback) => frames.push(callback));
  vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

// What every handler that gets the live runtime deps has in common.
const expectRuntimeDeps = (deps, el, authService) => {
  expect(Object.keys(deps).sort()).toEqual(RUNTIME_DEP_KEYS);
  expect(deps).toBe(el._runtimeDeps);
  expect(deps).not.toBe(el.deps);
  expect(deps.refs).toBe(el.refIds);
  expect(deps.store).toBe(el.store);
  expect(deps.props).toBe(el.props);
  expect(deps.handlers).toBe(el.handlers);
  expect(deps.constants).toBe(el.constants);
  expect(deps.authService).toBe(authService);
  expect(deps.locale).toBeUndefined();
  expect(typeof deps.dispatchEvent).toBe("function");
  // The runtime copy binds render; only el.deps carries the element's own function.
  expect(typeof deps.render).toBe("function");
  expect(deps.render).not.toBe(el.render);
};

describe("deps passed to handlers", () => {
  it("handleBeforeMount: runtime deps, refs not yet populated", () => {
    const fixture = createFixture();
    const el = fixture.mountStandalone();
    const { deps, payload, refKeys } = fixture.seen.beforeMount;
    expectRuntimeDeps(deps, el, fixture.authService);
    expect(payload).toBeUndefined();
    expect(refKeys).toEqual([]);
  });

  it("handleAfterMount: the same runtime deps, refs populated by the first render", () => {
    const fixture = createFixture();
    const el = fixture.mountStandalone();
    const { deps, payload, refKeys } = fixture.seen.afterMount;
    expectRuntimeDeps(deps, el, fixture.authService);
    expect(deps).toBe(fixture.seen.beforeMount.deps);
    expect(payload).toBeUndefined();
    expect(refKeys).toEqual(["saveButton"]);
  });

  it("a ref event handler: runtime deps and an { _event } payload", () => {
    const fixture = createFixture();
    const el = fixture.mountStandalone();
    el.refIds.saveButton.click();
    const { deps, payload } = fixture.seen.click;
    expectRuntimeDeps(deps, el, fixture.authService);
    expect(Object.keys(payload)).toEqual(["_event"]);
    expect(payload._event).toBeInstanceOf(Event);
  });

  it("handleOnUpdate after an imperative prop write: runtime deps", () => {
    const fixture = createFixture();
    const el = fixture.mountStandalone();
    el.heading = "next";
    const { deps, payload } = fixture.seen.onUpdate;
    expectRuntimeDeps(deps, el, fixture.authService);
    expect(payload).toEqual({ changedProp: "heading", oldProps: {}, newProps: { heading: "next" } });
    expect(frames).toHaveLength(0);
  });

  it("handleOnUpdate after setAttribute: runtime deps", () => {
    const fixture = createFixture();
    const el = fixture.mountStandalone();
    el.setAttribute("heading", "next");
    const { deps, payload } = fixture.seen.onUpdate;
    expectRuntimeDeps(deps, el, fixture.authService);
    expect(payload).toEqual({ changedProp: "heading", oldProps: {}, newProps: { heading: "next" } });
    expect(frames).toHaveLength(0);
  });

  it("handleOnUpdate after a parent patch: a fresh deps object with a bound render", () => {
    const fixture = createFixture();
    const { parent, child } = fixture.mountUnderParent();
    expect(fixture.handlers.handleOnUpdate).not.toHaveBeenCalled();
    parent.store.setHeading({ heading: "second" });
    parent.render();
    flushFrames();

    expect(fixture.handlers.handleOnUpdate).toHaveBeenCalledTimes(1);
    const { deps, payload } = fixture.seen.onUpdate;
    expect(payload).toEqual({ oldProps: { heading: "first" }, newProps: { heading: "second" } });
    expect(Object.keys(deps).sort()).toEqual(RUNTIME_DEP_KEYS);
    expect(deps).not.toBe(child.deps);
    expect(deps).not.toBe(child._runtimeDeps);
    expect(deps.store).toBe(child.store);
    expect(deps.handlers).toBe(child.handlers);
    expect(deps.refs).toBe(child.refIds);
    expect(deps.props).toBe(child.props);
    expect(deps.authService).toBe(fixture.authService);
    expect(deps.constants).toBe(child.constants);
    // A bound copy, so it differs from both el.render and the runtime deps' render.
    expect(typeof deps.render).toBe("function");
    expect(deps.render).not.toBe(child.render);
    expect(deps.render).not.toBe(child._runtimeDeps.render);
    expect(typeof deps.dispatchEvent).toBe("function");
  });

  it("a method: called on the element with only the payload, no deps", () => {
    const fixture = createFixture();
    const el = fixture.mountStandalone();
    const payload = { a: 1 };
    expect(el.focusInput(payload)).toBe("focused");
    expect(fixture.methodCalls).toHaveLength(1);
    const { self, args } = fixture.methodCalls[0];
    expect(self).toBe(el);
    expect(args).toHaveLength(1);
    expect(args[0]).toBe(payload);
    // What a method can reach through `this`.
    expect(self.deps).toBe(el.deps);
    expect(self._runtimeDeps).toBe(el._runtimeDeps);
    expect(Object.keys(self.deps).sort()).toEqual([
      "authService",
      "constants",
      "handlers",
      "locale",
      "props",
      "render",
      "store",
    ]);
  });
});

describe("el.deps", () => {
  it("is the element's own deps: setup deps plus store, render, props, handlers and constants", () => {
    const fixture = createFixture({ constants: { limit: 3 } });
    const el = fixture.mountStandalone();
    expect(Object.keys(el.deps).sort()).toEqual([
      "authService",
      "constants",
      "handlers",
      "locale",
      "props",
      "render",
      "store",
    ]);
    expect(el.deps.render).toBe(el.render);
    expect(el.deps.store).toBe(el.store);
    expect(el.deps.props).toBe(el.props);
    expect(el.deps.handlers).toBe(el.handlers);
    expect(el.deps.constants).toBe(el.constants);
    expect(el.constants).toEqual({ limit: 3 });
    expect(el.deps.refs).toBeUndefined();
    expect(el.deps.dispatchEvent).toBeUndefined();
  });

  it("keeps the same el.deps object across reconnect", () => {
    const fixture = createFixture();
    const el = fixture.mountStandalone();
    const { deps } = el;
    el.remove();
    document.body.appendChild(el);
    expect(el.deps).toBe(deps);
  });
});

describe("deps with an i18n runtime", () => {
  const createI18nFixture = () => {
    const runtime = createI18nRuntime({
      defaultLocale: "en",
      fallbackLocale: "en",
      locales: ["en", "vi"],
      initialCatalogs: { en: { common: { save: "Save" } }, vi: { common: { save: "Luu" } } },
    });
    return { runtime, fixture: createFixture({ setupDeps: { __rtglI18nRuntime: runtime } }) };
  };

  it("adds __rtglI18nRuntime, locale and an i18n getter to the runtime deps and el.deps", () => {
    const { runtime, fixture } = createI18nFixture();
    const el = fixture.mountStandalone();
    const expectedKeys = [...RUNTIME_DEP_KEYS, "__rtglI18nRuntime", "i18n"].sort();

    const { deps } = fixture.seen.beforeMount;
    expect(Object.keys(deps).sort()).toEqual(expectedKeys);
    expect(deps.__rtglI18nRuntime).toBe(runtime);
    // `locale` is the runtime's locale controller, not the locale string.
    expect(deps.locale).toBe(runtime.locale);
    expect(deps.locale.current()).toBe("en");
    expect(deps.i18n).toBe(runtime.getMessages());
    expect(Object.getOwnPropertyDescriptor(deps, "i18n").get).toBeTypeOf("function");

    expect(Object.keys(el.deps).sort()).toEqual(
      ["__rtglI18nRuntime", "authService", "constants", "handlers", "i18n", "locale", "props", "render", "store"],
    );
    expect(el.deps.locale).toBe(runtime.locale);
    expect(el.deps.i18n).toBe(runtime.getMessages());
    expect(Object.getOwnPropertyDescriptor(el.deps, "i18n").get).toBeTypeOf("function");
  });

  it("gives a parent patch the runtime, locale and a plain i18n value captured at patch time", async () => {
    const { runtime, fixture } = createI18nFixture();
    const { parent } = fixture.mountUnderParent();
    // Switch after mount, so a value captured any earlier than the patch would be stale.
    await runtime.locale.set("vi");
    parent.store.setHeading({ heading: "second" });
    parent.render();
    flushFrames();

    const { deps } = fixture.seen.onUpdate;
    expect(Object.keys(deps).sort()).toEqual([...RUNTIME_DEP_KEYS, "__rtglI18nRuntime", "i18n"].sort());
    expect(deps.__rtglI18nRuntime).toBe(runtime);
    expect(deps.locale).toBe(runtime.locale);
    // Unlike the runtime deps and el.deps, the parent-patch copy holds the value, not a getter.
    const i18nDescriptor = Object.getOwnPropertyDescriptor(deps, "i18n");
    expect(i18nDescriptor.get).toBeUndefined();
    expect(i18nDescriptor.value).toBe(runtime.getMessages());
    expect(i18nDescriptor.value.common.save).toBe("Luu");
  });
});
