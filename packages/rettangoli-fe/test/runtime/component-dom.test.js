import { describe, expect, it } from "vitest";
import { initializeComponentDom } from "../../src/web/componentDom.js";

const createHostStub = () => {
  const host = {
    style: { display: "" },
    appendedChildren: [],
    attachShadow: () => {
      host.shadow = {
        adoptedStyleSheets: [],
        appendChild: (child) => {
          child.parentNode = host.shadow;
        },
      };
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
});
