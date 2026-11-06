// @vitest-environment jsdom
/**
 * An HTML document lowercases attribute names, so `setAttribute("maxLength")`
 * sets `maxlength`. Components observe that name next to the kebab-case one
 * and report the change under the schema prop name, the way a kebab-case
 * attribute change is reported.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "jempl";
import createComponent from "../../src/createComponent.js";

let componentNumber = 0;
let frames;

const flushFrames = () => {
  frames.splice(0).forEach((callback) => callback());
};

const defineComponent = ({ handlers = {} } = {}) => {
  const name = `x-observe-${componentNumber++}`;
  customElements.define(name, createComponent({
    schema: {
      componentName: name,
      propsSchema: { type: "object", properties: { maxLength: {}, label: {} } },
    },
    view: { template: parse([{ span: "${maxLength}/${label}" }]), refs: {}, styles: {} },
    store: { selectViewData: ({ props }) => ({ maxLength: props.maxLength, label: props.label }) },
    handlers,
  }, {}));
  return name;
};

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

describe("lowercased camelCase prop attributes", () => {
  it("are observed next to the kebab-case and camelCase names", () => {
    const name = defineComponent();
    expect(customElements.get(name).observedAttributes).toEqual(
      expect.arrayContaining(["key", "maxLength", "max-length", "maxlength", "label"]),
    );
  });

  it("report setAttribute('maxLength') to handleOnUpdate under the prop name", () => {
    const calls = [];
    const el = document.body.appendChild(document.createElement(defineComponent({
      handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) },
    })));
    el.setAttribute("maxLength", "5");
    el.setAttribute("maxlength", "6");
    el.removeAttribute("maxLength");
    expect(calls).toEqual([
      { changedProp: "maxLength", oldProps: {}, newProps: { maxLength: "5" } },
      { changedProp: "maxLength", oldProps: { maxLength: "5" }, newProps: { maxLength: "6" } },
      { changedProp: "maxLength", oldProps: { maxLength: "6" }, newProps: {} },
    ]);
    expect(frames).toHaveLength(0);
  });

  it("render once in the next frame without handleOnUpdate", () => {
    const el = document.body.appendChild(document.createElement(defineComponent()));
    const render = vi.spyOn(el, "render");
    el.setAttribute("maxLength", "5");
    expect(frames).toHaveLength(1);
    expect(text(el)).toBe("/");
    flushFrames();
    expect(render).toHaveBeenCalledTimes(1);
    expect(text(el)).toBe("5/");
  });

  it("do nothing new when set before the element connects", () => {
    const calls = [];
    const el = document.createElement(defineComponent({
      handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) },
    }));
    el.setAttribute("maxLength", "5");
    expect(calls).toEqual([]);
    expect(frames).toHaveLength(0);
    document.body.appendChild(el);
    expect(text(el)).toBe("5/");
    expect(calls).toEqual([]);
    expect(frames).toHaveLength(0);
  });
});

describe("a parent patch that changes a camelCase attribute on a child", () => {
  const mountParent = (childName) => {
    const parentName = `x-observe-parent-${componentNumber++}`;
    customElements.define(parentName, createComponent({
      schema: { componentName: parentName, propsSchema: { type: "object", properties: {} } },
      view: { template: parse([{ [`${childName} maxLength=\${max} label=\${label}`]: "" }]), refs: {}, styles: {} },
      store: {
        createInitialState: () => ({ max: "1", label: "a" }),
        selectViewData: ({ state }) => ({ ...state }),
        change: ({ state }, payload) => Object.assign(state, payload),
      },
      handlers: {},
    }, {}));
    const parent = document.body.appendChild(document.createElement(parentName));
    return { parent, child: parent.renderTarget.firstElementChild };
  };

  it("fires no extra handleOnUpdate or render", () => {
    const calls = [];
    const childName = defineComponent({
      handlers: { handleOnUpdate: (deps, changes) => calls.push(changes) },
    });
    const { parent, child } = mountParent(childName);
    expect(child.getAttribute("maxlength")).toBe("1");
    const render = vi.spyOn(child, "render");

    parent.store.change({ max: "2" });
    parent.render();
    expect(child.getAttribute("maxlength")).toBe("2");
    expect(calls).toEqual([]);
    expect(render).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);

    flushFrames();
    expect(render).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([{
      oldProps: { maxLength: "1", label: "a" },
      newProps: { maxLength: "2", label: "a" },
    }]);
    expect(text(child)).toBe("2/a");
    expect(frames).toHaveLength(0);
  });

  it("renders a child without handleOnUpdate once", () => {
    const { parent, child } = mountParent(defineComponent());
    const render = vi.spyOn(child, "render");
    parent.store.change({ max: "2", label: "b" });
    parent.render();
    expect(frames).toHaveLength(1);
    flushFrames();
    expect(render).toHaveBeenCalledTimes(1);
    expect(text(child)).toBe("2/b");
    expect(frames).toHaveLength(0);
  });
});
