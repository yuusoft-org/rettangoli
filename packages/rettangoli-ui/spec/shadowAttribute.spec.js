// @vitest-environment jsdom
// @rettangoli/fe mirrors attributes on custom elements into same-named
// properties, so `shadow=md` sets `element.shadow = "md"`. The primitives
// must read their shadow root from `this.shadowRoot`, never `this.shadow`.
import { parse } from "jempl";
import { createComponent } from "@rettangoli/fe";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import createButton from "../src/primitives/button.js";
import createGrid from "../src/primitives/grid.js";
import createImage from "../src/primitives/image.js";
import createSvg from "../src/primitives/svg.js";
import createText from "../src/primitives/text.js";
import createView from "../src/primitives/view.js";

let errors;
const onError = (event) => {
  errors.push(String(event.error ?? event.message));
  event.preventDefault();
};

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", class {
    replaceSync(cssText) {
      this.cssText = cssText;
    }
  });
  customElements.define("rtgl-view", createView({}));
  customElements.define("rtgl-grid", createGrid({}));
  customElements.define("rtgl-image", createImage({}));
  customElements.define("rtgl-text", createText({}));
  customElements.define("rtgl-button", createButton({}));
  const Svg = createSvg({});
  customElements.define("rtgl-svg", Svg);
  Svg.addIcon("shadow-test", '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>');
});

beforeEach(() => {
  errors = [];
  window.addEventListener("error", onError);
});

afterEach(() => {
  window.removeEventListener("error", onError);
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

let componentCount = 0;
// Mounts a fe component whose view is `template` and returns its shadow root.
const renderWithFe = async (template) => {
  const componentName = `x-shadow-attribute-${++componentCount}`;
  customElements.define(componentName, createComponent({
    schema: { componentName, propsSchema: { type: "object", properties: {} } },
    view: { template: parse(template), refs: {}, styles: {} },
    store: { createInitialState: () => ({}), selectViewData: () => ({}) },
    handlers: {},
  }, {}));
  const host = document.createElement(componentName);
  document.body.appendChild(host);
  await vi.waitFor(() => expect(host.shadowRoot?.querySelector("#first")).toBeTruthy());
  return host.shadowRoot;
};

describe("shadow attribute on primitives", () => {
  it("renders the link of rtgl-view, rtgl-grid, rtgl-image and rtgl-text with a shadow attribute", async () => {
    const root = await renderWithFe([
      { "rtgl-view#first href=/view shadow=md p=md": [{ "rtgl-text": "Card" }] },
      { "rtgl-grid#grid href=/grid shadow=sm": "Grid" },
      { "rtgl-image#image href=/image shadow=sm src=/a.png": null },
      { "rtgl-text#text href=/text shadow=sm": "Text" },
    ]);

    expect(errors).toEqual([]);
    for (const [id, href] of [["first", "/view"], ["grid", "/grid"], ["image", "/image"], ["text", "/text"]]) {
      const element = root.getElementById(id);
      expect(element.getAttribute("shadow")).not.toBeNull();
      expect(element.shadowRoot.querySelector("a")?.getAttribute("href")).toBe(href);
    }
  });

  it("renders rtgl-button and rtgl-svg with a shadow attribute", async () => {
    const root = await renderWithFe([
      { "rtgl-button#first href=/button shadow=sm": "Go" },
      { "rtgl-svg#icon shadow=sm svg=shadow-test": null },
    ]);
    const button = root.getElementById("first");
    expect(button.shadowRoot.querySelector("a.surface")?.getAttribute("href")).toBe("/button");
    button.removeAttribute("href");
    expect(button.shadowRoot.querySelector("button.surface")).not.toBeNull();
    await vi.waitFor(() => expect(root.getElementById("icon").shadowRoot.querySelector("circle")).not.toBeNull());
    expect(errors).toEqual([]);
  });

  it("keeps the link in sync when href changes after a shadow attribute", async () => {
    const root = await renderWithFe([{ "rtgl-view#first shadow=md": "Card" }]);
    const view = root.getElementById("first");
    view.setAttribute("href", "/later");
    expect(view.shadowRoot.querySelector("a")?.getAttribute("href")).toBe("/later");
    view.removeAttribute("href");
    expect(view.shadowRoot.querySelector("a")).toBeNull();
    expect(errors).toEqual([]);
  });

  it("still exposes the deprecated shadow alias when no shadow attribute is set", async () => {
    const root = await renderWithFe([
      { "rtgl-view#first href=/view": "Card" },
      { "rtgl-image#image src=/a.png": null },
    ]);
    for (const id of ["first", "image"]) {
      const element = root.getElementById(id);
      expect(element.shadow).toBe(element.shadowRoot);
    }
    expect(errors).toEqual([]);
  });
});
