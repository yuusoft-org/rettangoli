// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "jempl";
import createComponent from "../../src/createComponent.js";
import { runRenderComponentLifecycle } from "../../src/core/runtime/componentOrchestrator.js";

// A component's render() can be called while that same component is still
// patching: a child it inserts dispatches from its mount hooks, or a focused
// element it moves or removes fires blur or focusout (covered in the browser
// by test/web/blur-on-removal.browser.mjs). That render must wait for the
// running patch instead of patching again from the stale tree.

let componentNumber = 0;
let frames;
let windowErrors;
let consoleErrors;

const onWindowError = (event) => {
  windowErrors.push(event.error || event.message);
  event.preventDefault();
};

const flushFrames = () => {
  for (let i = 0; i < 10 && frames.length; i += 1) {
    frames.splice(0).forEach((callback) => callback());
  }
};

const define = (config) => {
  customElements.define(config.schema.componentName, createComponent(config, {}));
  return config.schema.componentName;
};

// A child whose handleAfterMount dispatches `ready` synchronously.
const defineChild = ({ dispatchTimes = Infinity, async = false } = {}) => {
  let dispatched = 0;
  return define({
    schema: {
      componentName: `x-reentry-child-${componentNumber++}`,
      propsSchema: { type: "object", properties: {} },
    },
    view: { template: parse([{ span: "child" }]), refs: {}, styles: {} },
    store: { createInitialState: () => ({}), selectViewData: () => ({}) },
    handlers: {
      handleAfterMount: (deps) => {
        if (dispatched >= dispatchTimes) return;
        dispatched += 1;
        const fire = () => deps.dispatchEvent(new CustomEvent("ready", { bubbles: true }));
        if (async) queueMicrotask(fire);
        else fire();
      },
    },
  });
};

const defineParent = ({ template, listener, refKey = "child", renderInHandler = true }) => {
  const handlerCalls = { count: 0 };
  const name = define({
    schema: {
      componentName: `x-reentry-parent-${componentNumber++}`,
      propsSchema: { type: "object", properties: {} },
    },
    view: {
      template: parse(template),
      refs: { [refKey]: { eventListeners: { ready: listener } } },
      styles: {},
    },
    store: {
      createInitialState: () => ({ ready: 0, show: false }),
      selectViewData: ({ state }) => ({ ...state }),
      markReady: ({ state }) => {
        state.ready += 1;
      },
      setShow: ({ state }, { show }) => {
        state.show = show;
      },
    },
    handlers: {
      handleChildReady: (deps) => {
        handlerCalls.count += 1;
        deps.store.markReady();
        if (renderInHandler) deps.render();
      },
    },
  });
  return { name, handlerCalls };
};

const mount = (name) => document.body.appendChild(document.createElement(name));
const children = (parent, childName) => [...parent.shadowRoot.querySelectorAll(childName)];

beforeEach(() => {
  frames = [];
  windowErrors = [];
  consoleErrors = [];
  vi.stubGlobal("requestAnimationFrame", (callback) => frames.push(callback));
  vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
  window.addEventListener("error", onWindowError);
  vi.spyOn(console, "error").mockImplementation((...args) => {
    consoleErrors.push(args);
  });
});

afterEach(() => {
  window.removeEventListener("error", onWindowError);
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("render() during the same component's patch", () => {
  it("does not recurse when a child dispatches on every mount and the parent renders", () => {
    const childName = defineChild();
    const { name, handlerCalls } = defineParent({
      template: [{ [`${childName}#child`]: "" }],
      listener: { handler: "handleChildReady" },
    });
    const parent = mount(name);

    expect(children(parent, childName)).toHaveLength(1);
    expect(handlerCalls.count).toBe(1);
    expect(parent.store.getState().ready).toBe(1);
    expect(windowErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  it("keeps one child, the tracked one, when a child dispatches once on the first patch", () => {
    const childName = defineChild({ dispatchTimes: 1 });
    const { name, handlerCalls } = defineParent({
      template: [{ [`${childName}#child`]: "" }],
      listener: { handler: "handleChildReady" },
    });
    const parent = mount(name);
    expect(children(parent, childName)).toHaveLength(1);

    parent.store.markReady();
    parent.render();
    parent.render();
    flushFrames();

    const live = children(parent, childName);
    expect(live).toHaveLength(1);
    expect(live[0]).toBe(parent._oldVNode.children[0].elm);
    expect(handlerCalls.count).toBe(1);
    expect(windowErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  it("keeps one child when an action listener re-renders during the first patch", () => {
    const childName = defineChild({ dispatchTimes: 1 });
    const { name } = defineParent({
      template: [{ [`${childName}#child`]: "" }],
      listener: { action: "markReady" },
    });
    const parent = mount(name);

    expect(children(parent, childName)).toHaveLength(1);
    expect(parent.store.getState().ready).toBe(1);
    expect(windowErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  it("keeps one child when a later patch inserts it, and removes it when hidden", () => {
    const childName = defineChild({ dispatchTimes: 1 });
    const { name } = defineParent({
      template: [
        { "span#before": "before" },
        { "$if show": [{ [`${childName}#child`]: "" }] },
        { "span#after": "after" },
      ],
      listener: { action: "markReady" },
    });
    const parent = mount(name);
    expect(children(parent, childName)).toHaveLength(0);

    parent.store.setShow({ show: true });
    parent.render();
    expect(children(parent, childName)).toHaveLength(1);
    expect(parent.store.getState().ready).toBe(1);
    parent.render();
    expect(children(parent, childName)).toHaveLength(1);
    expect(parent.shadowRoot.querySelectorAll("span")).toHaveLength(2);

    parent.store.setShow({ show: false });
    parent.render();
    expect(children(parent, childName)).toHaveLength(0);
    expect(windowErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  it("runs the deferred render after the patch, inside the same render() call", () => {
    const childName = defineChild({ dispatchTimes: 1 });
    const name = define({
      schema: {
        componentName: `x-reentry-label-${componentNumber++}`,
        propsSchema: { type: "object", properties: {} },
      },
      view: {
        template: parse([{ "span#label": "${label}" }, { "$if show": [{ [`${childName}#child`]: "" }] }]),
        refs: { child: { eventListeners: { ready: { action: "setLabel", payload: { label: "ready" } } } } },
        styles: {},
      },
      store: {
        createInitialState: () => ({ label: "idle", show: false }),
        selectViewData: ({ state }) => ({ ...state }),
        setLabel: ({ state }, { label }) => {
          state.label = label;
        },
        setShow: ({ state }) => {
          state.show = true;
        },
      },
      handlers: {},
    });
    const parent = mount(name);
    const label = parent.shadowRoot.querySelector("#label");

    parent.store.setShow();
    parent.render();

    expect(label.textContent).toBe("ready");
    expect(parent.shadowRoot.querySelector("#label")).toBe(label);
    expect(children(parent, childName)).toHaveLength(1);
    expect(frames).toEqual([]);
  });

  it("stops after 10 passes and reports it when every pass requests another", () => {
    // Each pass gives the child a new id, so a new child mounts and requests
    // another render: the old code recursed until the stack overflowed.
    const childName = defineChild();
    const { name, handlerCalls } = defineParent({
      template: [{ [`${childName}#child\${ready}`]: "" }],
      refKey: "child*",
      listener: { handler: "handleChildReady" },
    });
    const parent = mount(name);

    expect(handlerCalls.count).toBe(10);
    expect(children(parent, childName)).toHaveLength(1);
    expect(windowErrors).toEqual([]);
    expect(consoleErrors).toEqual([
      [`[Render] ${name} requested render during its own patch 10 times; stopping`],
    ]);

    // The guard resets: a later render works and starts a fresh count.
    consoleErrors.length = 0;
    parent.render();
    expect(children(parent, childName)).toHaveLength(1);
    expect(consoleErrors).toHaveLength(1);
  });

  it("still renders a nested component of the same type inside its parent's patch", () => {
    // The guard is per instance: a child, even one of its parent's own type,
    // renders synchronously while the parent patches.
    const name = `x-reentry-nest-${componentNumber++}`;
    define({
      schema: {
        componentName: name,
        propsSchema: { type: "object", properties: { depth: { type: "number" } } },
      },
      view: {
        template: parse([
          { "span#label": "depth ${depth}" },
          { "$if depth > 0": [{ [`${name}#inner :depth=\${childDepth}`]: "" }] },
        ]),
        refs: {},
        styles: {},
      },
      store: {
        createInitialState: () => ({}),
        selectViewData: ({ props }) => ({ depth: props.depth ?? 2, childDepth: (props.depth ?? 2) - 1 }),
      },
      handlers: {},
    });
    const root = mount(name);
    const inner = root.shadowRoot.querySelector(name);
    const innermost = inner.shadowRoot.querySelector(name);

    expect(root.shadowRoot.querySelector("#label").textContent).toBe("depth 2");
    expect(inner.shadowRoot.querySelector("#label")?.textContent).toBe("depth 1");
    expect(innermost.shadowRoot.querySelector("#label")?.textContent).toBe("depth 0");
    expect(innermost.shadowRoot.querySelector(name)).toBeNull();
    expect(consoleErrors).toEqual([]);
  });

  it("control: a parent handler that does not render leaves one child", () => {
    const childName = defineChild();
    const { name, handlerCalls } = defineParent({
      template: [{ [`${childName}#child`]: "" }],
      listener: { handler: "handleChildReady" },
      renderInHandler: false,
    });
    const parent = mount(name);

    expect(children(parent, childName)).toHaveLength(1);
    expect(handlerCalls.count).toBe(1);
    expect(consoleErrors).toEqual([]);
  });

  it("control: a dispatch in a microtask renders after the patch", async () => {
    const childName = defineChild({ async: true });
    const { name, handlerCalls } = defineParent({
      template: [{ [`${childName}#child`]: "" }],
      listener: { handler: "handleChildReady" },
    });
    const parent = mount(name);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(children(parent, childName)).toHaveLength(1);
    expect(handlerCalls.count).toBe(1);
    expect(consoleErrors).toEqual([]);
  });
});

describe("runRenderComponentLifecycle re-entry", () => {
  const createInstance = (patch) => ({
    elementName: "x-direct",
    patch,
    template: [],
    viewData: {},
    refs: {},
    refIds: {},
    transformedHandlers: {},
    renderTarget: { id: "target" },
  });
  const render = (instance, onError = () => {}) => runRenderComponentLifecycle({
    instance,
    createComponentUpdateHookFn: () => null,
    parseViewFn: () => ({ sel: "div", data: {} }),
    collectRefElementsFn: () => ({}),
    onError,
  });

  it("returns the current tree from a nested call and patches once more afterwards", () => {
    const calls = [];
    let nestedResult;
    const instance = createInstance((oldNode, nextNode) => {
      calls.push(oldNode);
      if (calls.length === 1) nestedResult = render(instance);
      return { ...nextNode, pass: calls.length };
    });
    instance._oldVNode = { pass: 0 };

    const result = render(instance);

    expect(nestedResult).toEqual({ pass: 0 });
    expect(calls).toEqual([{ pass: 0 }, { sel: "div", data: {}, pass: 1 }]);
    expect(result).toEqual({ sel: "div", data: {}, pass: 2 });
    expect(instance._oldVNode).toBe(result);
  });

  it("still runs the requested pass when the first pass throws, and resets afterwards", () => {
    const errors = [];
    let passes = 0;
    const instance = createInstance((_oldNode, nextNode) => {
      passes += 1;
      if (passes === 1) {
        render(instance);
        throw new Error("first pass failed");
      }
      return nextNode;
    });
    instance._oldVNode = { previous: true };

    const result = render(instance, (error) => errors.push(error.message));

    expect(errors).toEqual(["first pass failed"]);
    expect(passes).toBe(2);
    expect(result).toEqual({ sel: "div", data: {} });
    render(instance);
    expect(passes).toBe(3);
  });
});
