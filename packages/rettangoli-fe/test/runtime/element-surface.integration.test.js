// @vitest-environment jsdom
/**
 * Pins what a connected component element exposes. Apps, ui and docs read
 * these members directly: `transformedHandlers` (ui createGlobalUI, creator),
 * `_runtimeDeps` (app e2e scripts), `deps`, `store`, `props`, `refIds`,
 * `render` and `shadow`. They are public in practice even where underscored.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "jempl";
import createComponent from "../../src/createComponent.js";

let componentNumber = 0;
let frames;

const flushFrames = () => {
  const pending = frames.splice(0);
  pending.forEach((callback) => callback());
};

const createFixture = ({ handlers: extraHandlers = {}, deps: extraDeps = {} } = {}) => {
  const id = componentNumber++;
  const parentName = `x-surface-parent-${id}`;
  const childName = `x-surface-child-${id}`;
  const authService = { name: "auth" };
  const deps = { authService, ...extraDeps };
  const handlers = {
    handleBeforeMount: vi.fn(),
    handleAfterMount: vi.fn(),
    handleClickItem: vi.fn(() => "handled"),
    ...extraHandlers,
  };
  const childUpdate = vi.fn();

  customElements.define(childName, createComponent({
    schema: {
      componentName: childName,
      propsSchema: { type: "object", properties: { label: {} } },
    },
    view: { template: parse([{ span: "${label}" }]), refs: {}, styles: {} },
    store: { selectViewData: ({ props }) => ({ label: props.label }) },
    handlers: { handleOnUpdate: childUpdate },
  }, deps));

  customElements.define(parentName, createComponent({
    schema: {
      componentName: parentName,
      propsSchema: { type: "object", properties: { heading: {}, itemCount: {} } },
    },
    view: {
      template: parse([
        { [`${childName} key=\${childKey} :label=\${label}`]: "" },
        { "button#saveButton": "Save" },
      ]),
      refs: { saveButton: { eventListeners: { click: { handler: "handleClickItem" } } } },
      styles: {},
    },
    store: {
      createInitialState: () => ({ childKey: "k1", label: "first" }),
      selectViewData: ({ state }) => ({ childKey: state.childKey, label: state.label }),
      setChild: ({ state }, payload) => {
        Object.assign(state, payload);
      },
    },
    handlers,
  }, deps));

  const mount = () => document.body.appendChild(document.createElement(parentName));
  return { parentName, childName, authService, handlers, childUpdate, mount };
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

describe("transformedHandlers", () => {
  it("holds handleCallStoreAction plus every handler by name", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    expect(Object.keys(el.transformedHandlers).sort()).toEqual([
      "handleAfterMount",
      "handleBeforeMount",
      "handleCallStoreAction",
      "handleClickItem",
    ]);
    Object.values(el.transformedHandlers).forEach((handler) => {
      expect(typeof handler).toBe("function");
    });
  });

  it("calls a handler with (deps, payload) and returns its result", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    const payload = { a: 1 };
    expect(el.transformedHandlers.handleClickItem(payload)).toBe("handled");
    expect(fixture.handlers.handleClickItem).toHaveBeenCalledTimes(1);
    const [deps, received] = fixture.handlers.handleClickItem.mock.calls[0];
    expect(deps).toBe(el._runtimeDeps);
    expect(received).toBe(payload);
  });

  it("runs a store action through handleCallStoreAction and re-renders", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    el.transformedHandlers.handleCallStoreAction({ _action: "setChild", label: "second" });
    expect(el.store.getState().label).toBe("second");
    flushFrames();
    const child = el.renderTarget.firstElementChild;
    expect(child.shadowRoot.querySelector("span").textContent).toBe("second");
  });
});

describe("_runtimeDeps and deps", () => {
  it("carries the setup deps next to the runtime members", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    expect(el._runtimeDeps.authService).toBe(fixture.authService);
    expect(el._runtimeDeps.store).toBe(el.store);
    expect(el._runtimeDeps.refs).toBe(el.refIds);
    expect(typeof el._runtimeDeps.dispatchEvent).toBe("function");
    expect(typeof el._runtimeDeps.render).toBe("function");
  });

  it("hands lifecycle handlers the same _runtimeDeps object", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    expect(fixture.handlers.handleBeforeMount.mock.calls[0][0]).toBe(el._runtimeDeps);
    expect(fixture.handlers.handleAfterMount.mock.calls[0][0]).toBe(el._runtimeDeps);
  });

  it("links deps to the element's own render, store and props", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    expect(el.deps.render).toBe(el.render);
    expect(el.deps.store).toBe(el.store);
    expect(el.deps.props).toBe(el.props);
    expect(el.deps.authService).toBe(fixture.authService);
    expect(el.deps.handlers).toBe(el.handlers);
    expect(el.deps.constants).toBe(el.constants);
  });
});

describe("render target and refs", () => {
  it("renders into [data-rtgl-render-target] with a nested component as firstElementChild", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    const renderTarget = el.shadowRoot.querySelector("[data-rtgl-render-target]");
    expect(renderTarget).not.toBeNull();
    expect(renderTarget).toBe(el.renderTarget);
    expect(el.shadow).toBe(el.shadowRoot);

    // App e2e scripts reach a child's deps exactly like this.
    const child = renderTarget.firstElementChild;
    expect(child.localName).toBe(fixture.childName);
    expect(child._runtimeDeps.authService).toBe(fixture.authService);
  });

  it("exposes refIds as a plain object keyed by element id", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    expect(Object.getPrototypeOf(el.refIds)).toBe(Object.prototype);
    expect(Object.keys(el.refIds)).toEqual(["saveButton"]);
    expect(el.refIds.saveButton).toBe(el.shadowRoot.querySelector("#saveButton"));
  });

  it("keeps the same refIds object across renders", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    const refIds = el.refIds;
    el.render();
    expect(el.refIds).toBe(refIds);
    expect(el._runtimeDeps.refs).toBe(refIds);
  });
});

describe("lifecycle of the surface", () => {
  it("lets render() run after disconnect without throwing", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    el.remove();
    expect(() => el.render()).not.toThrow();
    expect(el.shadowRoot.querySelector("[data-rtgl-render-target]")).not.toBeNull();
  });

  it("keeps _runtimeDeps but rebuilds transformedHandlers on reconnect", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    const runtimeDeps = el._runtimeDeps;
    const transformedHandlers = el.transformedHandlers;
    const parent = el.parentNode;
    el.remove();
    parent.appendChild(el);
    expect(el._runtimeDeps).toBe(runtimeDeps);
    expect(el.transformedHandlers).not.toBe(transformedHandlers);
    expect(Object.keys(el.transformedHandlers).sort()).toEqual(Object.keys(transformedHandlers).sort());
    expect(fixture.handlers.handleBeforeMount).toHaveBeenCalledTimes(2);
    expect(fixture.handlers.handleBeforeMount.mock.calls[1][0]).toBe(runtimeDeps);
  });

  it("passes a host-level key= to a parent-driven handleOnUpdate in newProps", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    const child = el.shadowRoot.querySelector(fixture.childName);
    expect(child.getAttribute("key")).toBe("k1");

    el.store.setChild({ childKey: "k2", label: "second" });
    el.render();
    expect(fixture.childUpdate).not.toHaveBeenCalled();
    flushFrames();

    expect(fixture.childUpdate).toHaveBeenCalledTimes(1);
    expect(fixture.childUpdate.mock.calls[0][1]).toEqual({
      oldProps: { key: "k1", label: "first" },
      newProps: { key: "k2", label: "second" },
    });
    expect(child.shadowRoot.querySelector("span").textContent).toBe("second");
  });
});

describe("element fields", () => {
  it("keeps the own fields of a connected element", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    // Declaration order is pinned too; refactors of the element class must keep it.
    expect(Object.keys(el)).toEqual([
      "elementName",
      "styles",
      "_snabbdomH",
      "store",
      "props",
      "propsSchema",
      "template",
      "handlers",
      "methods",
      "constants",
      "transformedHandlers",
      "refs",
      "refIds",
      "patch",
      "_unmountCallback",
      "_globalListenersCleanup",
      "_oldVNode",
      "_runtimeDeps",
      "deps",
      "i18nRuntime",
      "_i18nUnsubscribe",
      "_propsSchemaKeys",
      "cssText",
      "_hotRecord",
      "_hotRevision",
      "_mountGeneration",
      "render",
      "heading",
      "itemCount",
      "shadow",
      "renderTarget",
    ]);
    expect(el.elementName).toBe(fixture.parentName);
    expect(el._propsSchemaKeys).toEqual(["heading", "itemCount"]);
    expect(el._mountGeneration).toBe(0);
    expect(el._hotRecord).toBeNull();
    expect(el._hotRevision).toBe(0);
    expect(typeof el.patch).toBe("function");
    expect(typeof el._snabbdomH).toBe("function");
    expect(el.handlers).toBe(fixture.handlers);
    expect(typeof el.store.getState).toBe("function");
    expect(el.cssText).toBe("");
  });

  it("exposes only schema props through the read-only props proxy", () => {
    const fixture = createFixture();
    const el = fixture.mount();
    el.heading = "T";
    expect(el.props.heading).toBe("T");
    expect(Object.keys(el.props)).toEqual(["heading", "itemCount"]);
    expect(el.props.unknown).toBeUndefined();
    expect(() => { el.props.heading = "x"; }).toThrow("Cannot assign to read-only proxy");
  });
});
