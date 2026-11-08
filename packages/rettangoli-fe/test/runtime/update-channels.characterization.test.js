// @vitest-environment jsdom
/**
 * Records, per update channel, the payload `handleOnUpdate` receives and when
 * it runs (synchronously, or in an animation frame), plus the lifecycle edges
 * that decide which channel a change takes: upgrade after attributes are set,
 * prop-versus-attribute precedence and reconnect.
 *
 * Several of these values are known quirks (one render per imperative change,
 * a handler payload that disagrees with `el.props`). They are pinned as they
 * are so any change to them is a reviewed test diff.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "jempl";
import { h } from "snabbdom/build/h.js";
import createComponent from "../../src/createComponent.js";
import createWebPatch from "../../src/createWebPatch.js";
import { parseView } from "../../src/parser.js";
import {
  RETTANGOLI_COMPONENT_MARKER,
  createWebComponentUpdateHook,
} from "../../src/web/componentUpdateHook.js";

let componentNumber = 0;
let frames;

const flushFrames = () => {
  frames.splice(0).forEach((callback) => callback());
};

const nextName = () => `x-channel-${componentNumber++}`;

const defineComponent = ({ name = nextName(), handlers = {} } = {}) => {
  customElements.define(name, createComponent({
    schema: {
      componentName: name,
      propsSchema: { type: "object", properties: { heading: {}, itemCount: {} } },
    },
    view: { template: parse([{ span: "${heading}/${itemCount}" }]), refs: {}, styles: {} },
    store: { selectViewData: ({ props }) => ({ heading: props.heading, itemCount: props.itemCount }) },
    handlers,
  }, {}));
  return name;
};

const mount = (name) => document.body.appendChild(document.createElement(name));
const text = (el) => el.shadowRoot.textContent;

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback) => frames.push(callback));
  vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("imperative changes with handleOnUpdate", () => {
  const setup = () => {
    const calls = [];
    const name = defineComponent({
      handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) },
    });
    const el = mount(name);
    const render = vi.spyOn(el, "render");
    return { calls, el, render };
  };

  it("runs the handler synchronously with { changedProp, oldProps, newProps } and renders nothing itself", () => {
    const { calls, el, render } = setup();
    el.heading = "one";
    expect(calls).toEqual([
      { changedProp: "heading", oldProps: {}, newProps: { heading: "one" } },
    ]);
    el.heading = "two";
    expect(calls[1]).toEqual({
      changedProp: "heading",
      oldProps: { heading: "one" },
      newProps: { heading: "two" },
    });
    expect(frames).toHaveLength(0);
    expect(render).not.toHaveBeenCalled();
    expect(text(el)).toBe("/");
  });

  it("reports an attribute change with the camelCase prop name and the raw attribute string", () => {
    const { calls, el } = setup();
    el.setAttribute("item-count", "3");
    expect(calls).toEqual([
      { changedProp: "itemCount", oldProps: {}, newProps: { itemCount: "3" } },
    ]);
    expect(frames).toHaveLength(0);
  });

  it("normalizes an empty attribute to true and a removed attribute to undefined", () => {
    const { calls, el } = setup();
    el.setAttribute("heading", "");
    el.removeAttribute("heading");
    expect(calls).toEqual([
      { changedProp: "heading", oldProps: {}, newProps: { heading: true } },
      { changedProp: "heading", oldProps: { heading: true }, newProps: {} },
    ]);
  });

  it("does not notify when the value did not change", () => {
    const { calls, el } = setup();
    el.heading = "one";
    el.heading = "one";
    el.setAttribute("item-count", "3");
    el.setAttribute("item-count", "3");
    expect(calls).toHaveLength(2);
  });

  it("treats a property write as winning over a later attribute for el.props, not for the payload", () => {
    const { calls, el } = setup();
    el.heading = "prop";
    el.setAttribute("heading", "attr");
    expect(el.props.heading).toBe("prop");
    expect(calls[1]).toEqual({ changedProp: "heading", oldProps: {}, newProps: { heading: "attr" } });

    el.heading = undefined;
    expect(el.props.heading).toBe("attr");
    expect(calls[2]).toEqual({ changedProp: "heading", oldProps: { heading: "prop" }, newProps: {} });
  });
});

describe("imperative changes without handleOnUpdate", () => {
  it("renders once per change, each in its own frame", () => {
    const name = defineComponent();
    const el = mount(name);
    const render = vi.spyOn(el, "render");
    el.heading = "a";
    el.heading = "b";
    el.setAttribute("item-count", "2");
    expect(frames).toHaveLength(3);
    expect(render).not.toHaveBeenCalled();
    expect(text(el)).toBe("/");

    flushFrames();
    expect(render).toHaveBeenCalledTimes(3);
    expect(text(el)).toBe("b/2");
  });

  it("skips a queued render once the element was disconnected", () => {
    const name = defineComponent();
    const el = mount(name);
    const render = vi.spyOn(el, "render");
    el.heading = "a";
    el.remove();
    flushFrames();
    expect(render).not.toHaveBeenCalled();
  });
});

describe("parent patches", () => {
  const defineParent = (childName) => {
    const parentName = nextName();
    customElements.define(parentName, createComponent({
      schema: { componentName: parentName, propsSchema: { type: "object", properties: {} } },
      view: {
        template: parse([{ [`${childName} :heading=\${heading} :itemCount=\${itemCount} key=\${key}`]: "" }]),
        refs: {},
        styles: {},
      },
      store: {
        createInitialState: () => ({ heading: "h1", itemCount: 1, key: "k1" }),
        selectViewData: ({ state }) => ({ ...state }),
        change: ({ state }, payload) => Object.assign(state, payload),
      },
      handlers: {},
    }, {}));
    const parent = mount(parentName);
    return { parent, child: parent.renderTarget.firstElementChild };
  };

  it("coalesces changes into one frame and reports { oldProps, newProps } after the render", () => {
    const order = [];
    const childName = defineComponent({
      handlers: { handleOnUpdate: (deps, changes) => order.push(["update", changes, text(child)]) },
    });
    const { parent, child } = defineParent(childName);
    const originalRender = child.render;
    child.render = () => { order.push(["render"]); originalRender(); };

    parent.store.change({ heading: "h2", itemCount: 2 });
    parent.render();
    expect(child.getAttribute("isDirty")).toBe("true");
    parent.store.change({ heading: "h3", itemCount: 3 });
    parent.render();
    expect(frames).toHaveLength(1);
    expect(order).toEqual([]);

    flushFrames();
    expect(child.hasAttribute("isDirty")).toBe(false);
    expect(order).toEqual([
      ["render"],
      [
        "update",
        {
          oldProps: { heading: "h1", itemCount: 1, key: "k1" },
          newProps: { heading: "h3", itemCount: 3, key: "k1" },
        },
        "h3/3",
      ],
    ]);
  });

  it("includes a host-level key= in newProps although it is not a schema prop", () => {
    const calls = [];
    const childName = defineComponent({ handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) } });
    const { parent, child } = defineParent(childName);
    parent.store.change({ key: "k2" });
    parent.render();
    flushFrames();
    expect(calls).toEqual([{
      oldProps: { heading: "h1", itemCount: 1, key: "k1" },
      newProps: { heading: "h1", itemCount: 1, key: "k2" },
    }]);
    expect(child.getAttribute("key")).toBe("k2");
    expect(child.props.key).toBeUndefined();
  });

  it("neither notifies nor renders for an identical parent render", () => {
    const calls = [];
    const childName = defineComponent({ handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) } });
    const { parent, child } = defineParent(childName);
    const render = vi.spyOn(child, "render");
    parent.render();
    parent.render();
    expect(frames).toHaveLength(0);
    expect(render).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("renders a child without a handler from the parent's props and fires no hook", () => {
    const childName = defineComponent();
    const { parent, child } = defineParent(childName);
    expect(text(child)).toBe("h1/1");
    parent.store.change({ heading: "h2" });
    parent.render();
    expect(text(child)).toBe("h1/1");
    flushFrames();
    expect(text(child)).toBe("h2/1");
  });
});

describe("the deps a parent patch hands to handleOnUpdate", () => {
  // Another bundle's component can lack members this runtime always creates,
  // so the hook builds its deps defensively. Drive the hook with a plain object.
  const createManagedElement = (overrides = {}) => ({
    [RETTANGOLI_COMPONENT_MARKER]: true,
    deps: { marker: "ok" },
    store: { getState: () => ({}) },
    handlers: { handleOnUpdate: vi.fn() },
    render: vi.fn(),
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    dispatchEvent: vi.fn(),
    ...overrides,
  });

  const runUpdate = (element) => {
    const hook = createWebComponentUpdateHook({ scheduleFrameFn: (callback) => callback() });
    hook.update({ data: { props: { a: 1 } } }, { data: { props: { a: 2 } }, elm: element });
    return element.handlers.handleOnUpdate.mock.calls[0][0];
  };

  it("falls back to a fresh empty refs object when the element has no refIds", () => {
    const element = createManagedElement();
    const deps = runUpdate(element);
    expect(deps.refs).toEqual({});
    expect(Object.getPrototypeOf(deps.refs)).toBe(Object.prototype);
    expect(deps.refs).not.toBe(element.refIds);
  });

  it("passes the element's own refIds object through when it has one", () => {
    const refIds = { saveButton: {} };
    const deps = runUpdate(createManagedElement({ refIds }));
    expect(deps.refs).toBe(refIds);
  });

  it("builds deps from element.deps with a bound copy of render, never element.render itself", () => {
    const element = createManagedElement();
    const deps = runUpdate(element);
    expect(Object.keys(deps).sort()).toEqual([
      "dispatchEvent",
      "handlers",
      "marker",
      "refs",
      "render",
      "store",
    ]);
    expect(deps.marker).toBe("ok");
    expect(deps.store).toBe(element.store);
    expect(deps.handlers).toBe(element.handlers);
    expect(deps.render).not.toBe(element.render);
    expect(element.render).toHaveBeenCalledTimes(1);
    deps.render();
    expect(element.render).toHaveBeenCalledTimes(2);
    deps.dispatchEvent(new Event("x"));
    expect(element.dispatchEvent).toHaveBeenCalledTimes(1);
  });
});

describe("upgrade, connect and reconnect", () => {
  it("renders from attributes that were set before the element was upgraded, without notifying", () => {
    const calls = [];
    const name = nextName();
    document.body.innerHTML = `<${name} heading="T" item-count="2"></${name}>`;
    defineComponent({
      name,
      handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) },
    });
    const el = document.body.firstElementChild;
    expect(calls).toEqual([]);
    expect(frames).toHaveLength(0);
    expect(text(el)).toBe("T/2");
    expect(el.props.heading).toBe("T");
    expect(el.props.itemCount).toBe("2");
  });

  it("keeps a property that was set on the element before upgrade, over its attribute", () => {
    const calls = [];
    const name = nextName();
    document.body.innerHTML = `<${name} item-count="2"></${name}>`;
    document.body.firstElementChild.itemCount = 5;
    defineComponent({
      name,
      handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) },
    });
    const el = document.body.firstElementChild;
    expect(calls).toEqual([]);
    expect(frames).toHaveLength(0);
    expect(el.props.itemCount).toBe(5);
    expect(text(el)).toBe("/5");
  });

  it("does not notify for attributes set between creation and connection", () => {
    const calls = [];
    const name = defineComponent({ handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) } });
    const el = document.createElement(name);
    el.setAttribute("heading", "T");
    el.itemCount = 4;
    document.body.appendChild(el);
    expect(calls).toEqual([]);
    expect(frames).toHaveLength(0);
    expect(text(el)).toBe("T/4");
  });

  it("reuses the shadow root and render target on reconnect and renders again", () => {
    const name = defineComponent();
    const el = mount(name);
    const { shadowRoot, renderTarget } = el;
    const generation = el._mountGeneration;
    const sheetCount = shadowRoot.adoptedStyleSheets.length;
    el.heading = "kept";
    flushFrames();
    expect(text(el)).toBe("kept/");
    const vnode = el._oldVNode;

    el.remove();
    document.body.appendChild(el);

    expect(el._oldVNode).not.toBe(vnode);
    expect(el.shadowRoot).toBe(shadowRoot);
    expect(el.renderTarget).toBe(renderTarget);
    expect(shadowRoot.querySelectorAll("[data-rtgl-render-target]")).toHaveLength(1);
    expect(shadowRoot.childNodes).toHaveLength(1);
    expect(shadowRoot.adoptedStyleSheets).toHaveLength(sheetCount);
    expect(el._mountGeneration).toBe(generation + 1);
    expect(text(el)).toBe("kept/");
    expect(el.props.heading).toBe("kept");
  });

  it("notifies synchronously again after a reconnect", () => {
    const calls = [];
    const name = defineComponent({ handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) } });
    const el = mount(name);
    el.remove();
    el.heading = "while-detached";
    expect(calls).toEqual([]);
    document.body.appendChild(el);
    el.itemCount = 1;
    expect(calls).toEqual([
      { changedProp: "itemCount", oldProps: { heading: "while-detached" }, newProps: { heading: "while-detached", itemCount: 1 } },
    ]);
  });
});

describe("parent patch through parseView on a standalone patch", () => {
  it("reports the first props as the baseline, not as a change", () => {
    const calls = [];
    const name = defineComponent({ handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) } });
    const patch = createWebPatch();
    let vnode = document.body.appendChild(document.createElement("div"));
    const render = (viewData) => {
      vnode = patch(vnode, parseView({
        h,
        template: parse([{ [`${name} :heading=\${heading}`]: "" }]),
        viewData,
        refs: {},
        handlers: {},
        createComponentUpdateHook: createWebComponentUpdateHook,
      }));
      return vnode.elm.querySelector(name);
    };
    const child = render({ heading: "a" });
    expect(text(child)).toBe("a/");
    expect(frames).toHaveLength(0);
    render({ heading: "b" });
    flushFrames();
    expect(calls).toEqual([{ oldProps: { heading: "a" }, newProps: { heading: "b" } }]);
    expect(text(child)).toBe("b/");
  });
});
