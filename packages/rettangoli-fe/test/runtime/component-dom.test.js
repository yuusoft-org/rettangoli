import { describe, expect, it } from "vitest";
import { initializeComponentDom } from "../../src/web/componentDom.js";

const createShadowStub = () => {
  const shadow = {
    adoptedStyleSheets: [],
    children: [],
    firstElementChild: null,
    querySelector: (selector) => {
      if (selector !== "[data-rtgl-render-target]") {
        return null;
      }

      return shadow.children.find(
        (child) => child.getAttribute?.("data-rtgl-render-target") !== null,
      ) ?? null;
    },
    appendChild: (child) => {
      if (!shadow.children.includes(child)) {
        shadow.children.push(child);
      }
      child.parentNode = shadow;
      shadow.firstElementChild = shadow.children[0] ?? null;
      return child;
    },
  };

  return shadow;
};

const createHostStub = () => {
  const host = {
    style: { display: "" },
    appendedChildren: [],
    attachShadowCalls: 0,
    attachShadow: () => {
      host.attachShadowCalls += 1;
      host.shadow = createShadowStub();
      host.shadowRoot = host.shadow;
      return host.shadow;
    },
    appendChild: (child) => {
      host.appendedChildren.push(child);
      child.parentNode = host;
    },
  };
  return host;
};

const createStyleSheetFactory = () => {
  const createdSheets = [];
  return {
    createdSheets,
    createStyleSheet: () => {
      const styleSheet = {
        cssText: "",
        replaceSync: (nextCssText) => {
          styleSheet.cssText = nextCssText;
        },
      };
      createdSheets.push(styleSheet);
      return styleSheet;
    },
  };
};

describe("initializeComponentDom", () => {
  it("sets up shadow root, render target, and style sheets", () => {
    const host = createHostStub();
    const { createStyleSheet, createdSheets } = createStyleSheetFactory();
    const createdElements = [];

    const { shadow, renderTarget, adoptedStyleSheets } = initializeComponentDom({
      host,
      cssText: ".root { color: red; }",
      createStyleSheet,
      createElement: (tagName) => {
        const element = {
          tagName,
          style: { cssText: "" },
          parentNode: null,
        };
        createdElements.push(element);
        return element;
      },
    });

    expect(shadow).toBe(host.shadow);
    expect(renderTarget).toBe(createdElements[0]);
    expect(renderTarget.style.cssText).toBe("display: contents;");
    expect(host.style.display).toBe("contents");
    expect(adoptedStyleSheets).toHaveLength(2);
    expect(createdSheets).toHaveLength(2);
    expect(createdSheets[1].cssText).toContain("color: red");
  });

  it("uses only common stylesheet when cssText is empty", () => {
    const host = createHostStub();
    const { createStyleSheet } = createStyleSheetFactory();

    const result = initializeComponentDom({
      host,
      cssText: "",
      createStyleSheet,
      createElement: () => ({
        style: { cssText: "" },
        parentNode: null,
      }),
    });

    expect(result.adoptedStyleSheets).toHaveLength(1);
  });

  it("reuses the existing shadow root and render target on reconnect", () => {
    const host = createHostStub();
    const { createStyleSheet } = createStyleSheetFactory();
    const createdElements = [];

    const firstDom = initializeComponentDom({
      host,
      cssText: ".root { color: red; }",
      createStyleSheet,
      createElement: (tagName) => {
        const element = {
          tagName,
          style: { cssText: "" },
          parentNode: null,
          __attrs: new Map(),
          setAttribute(name, value) {
            this.__attrs.set(name, String(value));
          },
          getAttribute(name) {
            if (!this.__attrs.has(name)) {
              return null;
            }
            return this.__attrs.get(name);
          },
        };
        createdElements.push(element);
        return element;
      },
    });

    const secondDom = initializeComponentDom({
      host,
      cssText: ".root { color: red; }",
      createStyleSheet,
      createElement: (tagName) => ({
        tagName,
        style: { cssText: "" },
        parentNode: null,
      }),
    });

    expect(host.attachShadowCalls).toBe(1);
    expect(secondDom.shadow).toBe(firstDom.shadow);
    expect(secondDom.renderTarget).toBe(firstDom.renderTarget);
    expect(createdElements).toHaveLength(1);
  });

  it("reattaches an existing render target to the shadow root", () => {
    const host = createHostStub();
    const { createStyleSheet } = createStyleSheetFactory();
    const shadow = createShadowStub();
    const renderTarget = {
      style: { cssText: "" },
      parentNode: null,
      __attrs: new Map([
        ["data-rtgl-render-target", ""],
      ]),
      setAttribute(name, value) {
        this.__attrs.set(name, String(value));
      },
      getAttribute(name) {
        if (!this.__attrs.has(name)) {
          return null;
        }
        return this.__attrs.get(name);
      },
    };

    shadow.firstElementChild = renderTarget;
    host.shadow = shadow;
    host.shadowRoot = shadow;

    initializeComponentDom({
      host,
      cssText: "",
      createStyleSheet,
      createElement: () => ({
        style: { cssText: "" },
        parentNode: null,
      }),
    });

    expect(renderTarget.parentNode).toBe(shadow);
    expect(host.appendedChildren).toHaveLength(0);
  });
});
