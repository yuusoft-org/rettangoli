// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "jempl";
import { h } from "snabbdom/build/h.js";
import createComponent from "../../src/createComponent.js";
import createWebPatch from "../../src/createWebPatch.js";
import { parseView } from "../../src/parser.js";
import { createWebComponentUpdateHook } from "../../src/web/componentUpdateHook.js";

let componentNumber = 0;
let frames;

const createFixture = ({ onUpdate = vi.fn() } = {}) => {
  const componentName = `x-parent-update-${componentNumber++}`;
  const createInitialState = vi.fn(({ props }) => ({ initial: props.initial }));
  const cleanup = vi.fn();
  const beforeMount = vi.fn(() => cleanup);
  customElements.define(componentName, createComponent({
    schema: {
      componentName,
      propsSchema: {
        type: "object",
        properties: { a: {}, b: {}, disabled: {}, fileId: {}, initial: {} },
      },
    },
    view: { template: parse([{ div: "${a}/${b}" }]), refs: {}, styles: {} },
    store: { createInitialState, selectViewData: ({ props }) => ({ a: props.a, b: props.b }) },
    handlers: { handleBeforeMount: beforeMount, ...(onUpdate ? { handleOnUpdate: onUpdate } : {}) },
  }, {}));
  const patch = createWebPatch();
  let vnode = document.body.appendChild(document.createElement("div"));
  const update = (bindings, viewData = {}) => {
    vnode = patch(vnode, parseView({
      h,
      template: parse([{ [`${componentName}#child.marker ${bindings}`]: "" }]),
      viewData,
      refs: {},
      handlers: {},
      createComponentUpdateHook: createWebComponentUpdateHook,
    }));
    return vnode.elm.querySelector(componentName);
  };
  return { update, onUpdate, createInitialState, beforeMount, cleanup };
};

const flushFrames = () => {
  const pending = frames.splice(0);
  pending.forEach((callback) => callback());
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

describe("parent patches of real FE custom elements", () => {
  it("initializes the store once with parent-bound props before mounting", () => {
    const fixture = createFixture();
    expect(fixture.createInitialState).not.toHaveBeenCalled();
    const child = fixture.update(":initial=${initial}", { initial: 42 });
    expect(child.store.getState()).toEqual({ initial: 42 });
    expect(fixture.beforeMount.mock.calls[0][0].store.getState()).toEqual({ initial: 42 });
    const parent = child.parentNode;
    child.remove();
    parent.appendChild(child);
    expect(child.store.getState()).toEqual({ initial: 42 });
    expect(fixture.createInitialState).toHaveBeenCalledTimes(1);
  });

  it("notifies once with coherent props after multiple parent patches", () => {
    const fixture = createFixture();
    const bindings = ":a=${a} :b=${b} ?disabled=${disabled}";
    const child = fixture.update(bindings, { a: 0, b: 0, disabled: false });
    const render = vi.spyOn(child, "render");
    fixture.update(bindings, { a: 1, b: 2, disabled: true });
    fixture.update(bindings, { a: 3, b: 4, disabled: false });
    expect(fixture.onUpdate).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    flushFrames();
    expect(render).toHaveBeenCalledTimes(1);
    expect(fixture.onUpdate).toHaveBeenCalledTimes(1);
    expect(fixture.onUpdate.mock.calls[0][1]).toEqual({
      oldProps: { a: 0, b: 0, disabled: false },
      newProps: { a: 3, b: 4, disabled: false },
    });
    expect(child.shadowRoot.textContent).toBe("3/4");
  });

  it("applies typed literal inputs when the child is constructed", () => {
    const fixture = createFixture();
    const child = fixture.update(":initial=${512} :disabled=${false}");
    expect(child.store.getState()).toEqual({ initial: 512 });
    expect(child.props.disabled).toBe(false);
  });

  it("clears removed bindings through third-party custom element setters", () => {
    const componentName = `x-external-${componentNumber++}`;
    const assigned = [];
    customElements.define(componentName, class extends HTMLElement {
      set options(value) { assigned.push(value); }
    });
    const patch = createWebPatch();
    const host = document.body.appendChild(document.createElement("div"));
    let vnode = patch(host, h(componentName, { props: { options: ["one"] } }));
    vnode = patch(vnode, h(componentName, {}));
    expect(assigned).toEqual([["one"], undefined]);
    patch(vnode, h(componentName, { props: { options: ["two"] } }));
    expect(assigned).toEqual([["one"], undefined, ["two"]]);
  });

  it("clears removed property and attribute bindings without deleting reactive setters", () => {
    const fixture = createFixture();
    const child = fixture.update("disabled :fileId=${fileId}", { fileId: "file-1" });
    expect(child.props.disabled).toBe(true);
    fixture.update("");
    flushFrames();
    expect(child.hasAttribute("disabled")).toBe(false);
    expect(child.props.disabled).toBeUndefined();
    expect(child.props.fileId).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(child, "disabled").set).toBeTypeOf("function");
    child.disabled = true;
    expect(child.props.disabled).toBe(true);
    expect(fixture.onUpdate).toHaveBeenCalledTimes(2);
  });

  it("preserves undefined when a previously defined optional prop is cleared", () => {
    const fixture = createFixture();
    const child = fixture.update(":fileId=${fileId}", { fileId: "file-1" });
    fixture.update(":fileId=${fileId}", { fileId: undefined });
    flushFrames();
    expect(child.props.fileId).toBeUndefined();
    expect(fixture.onUpdate.mock.calls[0][1].newProps).toEqual({ fileId: undefined });
  });

  it("applies custom-element shorthand classes alongside the class attribute", () => {
    const fixture = createFixture();
    const child = fixture.update('class="other third"');
    expect([...child.classList]).toEqual(["marker", "other", "third"]);
  });

  it("cancels updates on disconnect, including a reconnect before the frame", () => {
    const fixture = createFixture();
    const child = fixture.update(":a=${a}", { a: 0 });
    fixture.update(":a=${a}", { a: 1 });
    const parent = child.parentNode;
    child.remove();
    expect(fixture.cleanup).toHaveBeenCalledTimes(1);
    parent.appendChild(child);
    flushFrames();
    expect(fixture.onUpdate).not.toHaveBeenCalled();
    expect(child.hasAttribute("isDirty")).toBe(false);
    fixture.update(":a=${a}", { a: 2 });
    flushFrames();
    expect(fixture.onUpdate).toHaveBeenCalledTimes(1);
    expect(fixture.onUpdate.mock.calls[0][1]).toEqual({ oldProps: { a: 1 }, newProps: { a: 2 } });
  });

  it("does not run a queued imperative render after disconnect", () => {
    const fixture = createFixture({ onUpdate: null });
    const child = fixture.update("");
    const render = vi.spyOn(child, "render");
    child.a = 1;
    child.remove();
    flushFrames();
    expect(render).not.toHaveBeenCalled();
  });
});
