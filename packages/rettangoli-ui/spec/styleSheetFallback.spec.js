// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import createSvg from "../src/primitives/svg.js";
import createView from "../src/primitives/view.js";
import createButton from "../src/primitives/button.js";
import createInput from "../src/primitives/input.js";
import createText from "../src/primitives/text.js";

const classes = {
  svg: createSvg({}),
  view: createView({}),
  button: createButton({}),
  input: createInput({}),
  text: createText({}),
};
const constructor = vi.fn(() => {
  throw new TypeError("Illegal constructor");
});

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", constructor);
  for (const [name, Class] of Object.entries(classes)) {
    customElements.define(`rtgl-fallback-${name}`, Class);
  }
});
afterAll(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("primitives without constructable stylesheets", () => {
  it.each(Object.keys(classes))("constructs and styles %s", (name) => {
    const element = document.createElement(`rtgl-fallback-${name}`);
    document.body.append(element);
    expect(
      element.shadowRoot.querySelectorAll("[data-rtgl-stylesheet]"),
    ).toHaveLength(1);
    expect(
      element.shadowRoot.querySelector("[data-rtgl-stylesheet]").textContent,
    ).toContain(":host");
    expect(constructor).not.toHaveBeenCalled();
    element.remove();
  });

  it("retains SVG styles when the icon changes or resets", () => {
    classes.svg.addIcon("fallback-one", "<svg><circle r='4'/></svg>");
    classes.svg.addIcon(
      "fallback-two",
      "<svg><rect width='4' height='4'/></svg>",
    );
    const svg = document.createElement("rtgl-fallback-svg");
    svg.setAttribute("svg", "fallback-one");
    document.body.append(svg);
    svg.setAttribute("svg", "fallback-two");
    expect(svg.shadowRoot.querySelector("rect")).toBeTruthy();
    svg.setAttribute("key", "reset");
    expect(
      svg.shadowRoot.querySelectorAll("[data-rtgl-stylesheet]"),
    ).toHaveLength(1);
    expect(svg.shadowRoot.querySelector("rect")).toBeTruthy();
    svg.remove();
  });
});
