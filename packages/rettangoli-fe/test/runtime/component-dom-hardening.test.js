/**
 * Covers two latent defects in render-target adoption.
 *
 * Both are reachable on the hot-update path today, and both become certain the
 * moment a shadow root carries server-rendered content.
 */

import { describe, expect, it } from "vitest";
import { initializeComponentDom } from "../../src/web/componentDom.js";

const createStyleSheet = () => ({
  replaceSync(text) {
    this.text = text;
  },
});

/** A stand-in element with a real tagName, which is what the guard keys off. */
const createNode = (tagName, attrs = {}) => {
  const node = {
    tagName,
    style: { cssText: "", display: "" },
    parentNode: null,
    __attrs: new Map(Object.entries(attrs)),
    setAttribute(name, value) {
      this.__attrs.set(name, String(value));
    },
    getAttribute(name) {
      return this.__attrs.has(name) ? this.__attrs.get(name) : null;
    },
  };
  return node;
};

const createShadow = (children) => {
  const shadow = {
    adoptedStyleSheets: [],
    children,
    get firstElementChild() {
      return shadow.children[0] ?? null;
    },
    querySelector(selector) {
      if (selector !== "[data-rtgl-render-target]") return null;
      return (
        shadow.children.find(
          (child) => child.getAttribute?.("data-rtgl-render-target") !== null,
        ) ?? null
      );
    },
    appendChild(child) {
      if (!shadow.children.includes(child)) shadow.children.push(child);
      child.parentNode = shadow;
    },
  };
  return shadow;
};

const createHost = (shadow) => ({
  shadowRoot: shadow,
  style: {},
  appended: [],
  appendChild(child) {
    this.appended.push(child);
  },
});

describe("render target adoption", () => {
  it("never adopts a <style> as the render target", () => {
    // The failure this prevents: the <style> is stamped as the render target
    // and given display:contents, then snabbdom replaces it on the first patch
    // because its sel cannot match the parser's `div` root -- leaving
    // instance.renderTarget pointing at a detached node.
    const styleNode = createNode("STYLE");
    const shadow = createShadow([styleNode]);
    const created = createNode("DIV");

    const dom = initializeComponentDom({
      host: createHost(shadow),
      cssText: "",
      createStyleSheet,
      createElement: () => created,
    });

    expect(dom.renderTarget).not.toBe(styleNode);
    expect(dom.renderTarget).toBe(created);
    expect(styleNode.getAttribute("data-rtgl-render-target")).toBeNull();
  });

  it.each(["LINK", "SLOT", "TEMPLATE", "SCRIPT"])(
    "never adopts a <%s> as the render target",
    (tagName) => {
      const node = createNode(tagName);
      const shadow = createShadow([node]);
      const created = createNode("DIV");

      const dom = initializeComponentDom({
        host: createHost(shadow),
        cssText: "",
        createStyleSheet,
        createElement: () => created,
      });

      expect(dom.renderTarget).toBe(created);
    },
  );

  it("still adopts an explicitly marked render target even after a <style>", () => {
    const styleNode = createNode("STYLE");
    const marked = createNode("DIV", { "data-rtgl-render-target": "" });
    const shadow = createShadow([styleNode, marked]);

    const dom = initializeComponentDom({
      host: createHost(shadow),
      cssText: "",
      createStyleSheet,
      createElement: () => createNode("DIV"),
    });

    expect(dom.renderTarget).toBe(marked);
  });

  it("still adopts an unmarked plain element, preserving legacy behaviour", () => {
    const legacy = createNode("DIV");
    const shadow = createShadow([legacy]);

    const dom = initializeComponentDom({
      host: createHost(shadow),
      cssText: "",
      createStyleSheet,
      createElement: () => createNode("DIV"),
    });

    expect(dom.renderTarget).toBe(legacy);
    expect(legacy.getAttribute("data-rtgl-render-target")).toBe("");
  });
});

describe("render target inline styles", () => {
  it("does not clobber existing inline styles when adopting", () => {
    const adopted = createNode("DIV", { "data-rtgl-render-target": "" });
    adopted.style.cssText = "color: red;";
    const shadow = createShadow([adopted]);

    initializeComponentDom({
      host: createHost(shadow),
      cssText: "",
      createStyleSheet,
      createElement: () => createNode("DIV"),
    });

    // display is set, and the pre-existing declaration block survives.
    expect(adopted.style.display).toBe("contents");
    expect(adopted.style.cssText).toBe("color: red;");
  });

  it("leaves display alone when it is already contents", () => {
    const adopted = createNode("DIV", { "data-rtgl-render-target": "" });
    adopted.style.display = "contents";
    adopted.style.cssText = "display: contents; color: blue;";
    const shadow = createShadow([adopted]);

    initializeComponentDom({
      host: createHost(shadow),
      cssText: "",
      createStyleSheet,
      createElement: () => createNode("DIV"),
    });

    expect(adopted.style.cssText).toBe("display: contents; color: blue;");
  });
});
