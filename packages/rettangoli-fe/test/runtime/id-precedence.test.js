// @vitest-environment jsdom
/**
 * Which id an element gets, and which ids take part in ref matching.
 * - An explicit id= wins over the selector id everywhere: the DOM, the vnode
 *   key and the refs.
 * - Only ids that ref keys can name (camelCase) take part in id-ref matching.
 *   Any other id (kebab-case, for example) still renders and keys the node,
 *   and class refs still match it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "jempl";
import { h } from "snabbdom/build/h.js";
import createComponent from "../../src/createComponent.js";
import createWebPatch from "../../src/createWebPatch.js";
import { parseView } from "../../src/parser.js";
import { collectRefElements } from "../../src/core/runtime/refs.js";
import { renderView } from "../../src/server/index.js";

const click = (key) => ({ eventListeners: { click: { handler: `handle:${key}` } } });

// Renders one element into real DOM and reports the DOM id, the vnode key,
// the keys of the collected ref elements and the refs whose listener is wired.
const observe = (selector, refKeys) => {
  const called = [];
  const refs = Object.fromEntries(refKeys.map((key) => [key, click(key)]));
  const handlers = Object.fromEntries(refKeys.map((key) => [`handle:${key}`, () => called.push(key)]));
  const vnode = parseView({ h, template: parse([{ [selector]: "" }]), viewData: {}, refs, handlers });
  const patched = createWebPatch()(document.createElement("div"), vnode);
  const node = vnode.children[0];
  const refIds = collectRefElements({ rootVNode: patched, refs });
  node.data.on?.click?.({ currentTarget: {}, target: {}, preventDefault() {}, stopPropagation() {} });
  return {
    domId: node.elm.id,
    key: node.data.key,
    refIds: Object.keys(refIds),
    wiredRefs: called,
    refIdsAreTheElement: Object.values(refIds).every((element) => element === node.elm),
  };
};

describe("id= and a selector id on one element", () => {
  it("gives a plain element the id= value in the DOM, the key and the refs", () => {
    expect(observe("div#a id=b", ["a", "b"])).toEqual({
      domId: "b", key: "b", refIds: ["b"], wiredRefs: ["b"], refIdsAreTheElement: true,
    });
  });

  it("matches a custom element, which already worked this way", () => {
    expect(observe("x-w#a id=b", ["a", "b"])).toEqual({
      domId: "b", key: "b", refIds: ["b"], wiredRefs: ["b"], refIdsAreTheElement: true,
    });
  });

  it("puts only the id= value on a server-rendered plain element", () => {
    expect(renderView({ template: parse([{ "div#a id=b": "" }]) })).toBe('<div style="display: contents"><div id="b"></div></div>');
  });
});

describe("ids that ref keys cannot name", () => {
  it("renders a kebab-case id in a view with an id ref, keyed by the id and outside id-ref matching", () => {
    expect(observe("div#main-content", ["submitButton", "main*"])).toEqual({
      domId: "main-content", key: "main-content", refIds: [], wiredRefs: [], refIdsAreTheElement: true,
    });
  });

  it("keeps a kebab-case selector id out of id-ref matching when id= is empty", () => {
    expect(observe('div#main-content id=""', ["main*"])).toEqual({
      domId: "main-content", key: "div#main-content-0", refIds: [], wiredRefs: [], refIdsAreTheElement: true,
    });
  });

  it("still lets a class ref match it, and keys the collected element by its id", () => {
    expect(observe("div#main-content.card", ["submitButton", ".card"])).toEqual({
      domId: "main-content", key: "main-content", refIds: ["main-content"], wiredRefs: [".card"], refIdsAreTheElement: true,
    });
  });

  it("keeps matching camelCase ids by id ref next to it", () => {
    const refs = { submitButton: click("submitButton") };
    const vnode = parseView({
      h,
      template: parse([{ "div#main-content": [{ "button#submitButton": "Go" }] }]),
      viewData: {},
      refs,
      handlers: { "handle:submitButton": () => {} },
    });
    const patched = createWebPatch()(document.createElement("div"), vnode);
    const button = vnode.children[0].children[0];
    expect(Object.keys(button.data.on)).toEqual(["click"]);
    expect(collectRefElements({ rootVNode: patched, refs })).toEqual({ submitButton: button.elm });
  });

  it("does not let collectRefElements match it by id ref either", () => {
    const elm = {};
    const rootVNode = { sel: "div", data: { attrs: { id: "main-content" } }, elm, children: [] };
    expect(collectRefElements({ rootVNode, refs: { "main*": {} } })).toEqual({});
    expect(collectRefElements({ rootVNode, refs: { "main*": {}, ".x": {} } })).toEqual({});
    const withClass = { ...rootVNode, data: { attrs: { id: "main-content" }, class: { x: true } } };
    expect(collectRefElements({ rootVNode: withClass, refs: { "main*": {}, ".x": {} } })).toEqual({ "main-content": elm });
  });

  it("renders it on the server", () => {
    expect(renderView({
      template: parse([{ "div#main-content": "" }]),
      refs: { submitButton: click("submitButton") },
    })).toBe('<div style="display: contents"><div id="main-content"></div></div>');
  });
});

describe("a component with an id ref and a kebab-case id", () => {
  let errors;

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", () => {});
    vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
    errors = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.replaceChildren();
    errors.mockRestore();
    vi.unstubAllGlobals();
  });

  it("renders its view and wires the id ref", () => {
    const clicks = [];
    customElements.define("x-kebab-id", createComponent({
      schema: { componentName: "x-kebab-id", propsSchema: { type: "object", properties: {} } },
      view: {
        template: parse([{ "div#main-content": [{ "button#submitButton": "Go" }] }]),
        refs: { submitButton: { eventListeners: { click: { handler: "handleSubmit" } } } },
        styles: {},
      },
      store: {},
      handlers: { handleSubmit: () => clicks.push("submit") },
    }, {}));
    const el = document.body.appendChild(document.createElement("x-kebab-id"));

    const root = el.shadowRoot.querySelector("#main-content");
    expect(root).not.toBeNull();
    expect(el.shadowRoot.querySelector("#submitButton").textContent).toBe("Go");
    expect(Object.keys(el.refIds)).toEqual(["submitButton"]);
    el.refIds.submitButton.click();
    expect(clicks).toEqual(["submit"]);
    expect(errors).not.toHaveBeenCalled();
  });
});
