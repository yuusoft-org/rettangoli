// @vitest-environment jsdom

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import createCheckbox from "../src/primitives/checkbox.js";

const TEST_TAG = "rtgl-checkbox-primitive-test";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);
  vi.stubGlobal("requestAnimationFrame", (callback) => {
    callback();
    return 0;
  });

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createCheckbox({}));
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const mountCheckbox = (attributes = {}) => {
  const checkbox = document.createElement(TEST_TAG);
  Object.entries(attributes).forEach(([name, value]) => {
    checkbox.setAttribute(name, value);
  });
  document.body.appendChild(checkbox);
  return {
    checkbox,
    input: checkbox.shadowRoot.querySelector('input[type="checkbox"]'),
  };
};

describe("rtgl-checkbox primitive", () => {
  it("draws the tick and dash in an SVG right after the native input", () => {
    const { checkbox, input } = mountCheckbox();
    const mark = input.nextElementSibling;

    expect(input.parentElement.className).toBe("checkbox-control");
    expect(mark.tagName.toLowerCase()).toBe("svg");
    expect(mark.getAttribute("class")).toBe("checkbox-mark");
    expect(mark.getAttribute("aria-hidden")).toBe("true");
    expect(
      [...mark.querySelectorAll("path")].map((path) => path.getAttribute("class")),
    ).toEqual(["checkbox-check", "checkbox-dash"]);
    expect(checkbox.shadowRoot.querySelectorAll("svg")).toHaveLength(1);
  });

  it("sets indeterminate from the attribute and the property", () => {
    const { checkbox, input } = mountCheckbox({ indeterminate: "" });

    expect(input.indeterminate).toBe(true);
    expect(checkbox.indeterminate).toBe(true);

    checkbox.removeAttribute("indeterminate");
    expect(input.indeterminate).toBe(false);

    checkbox.indeterminate = true;
    expect(input.indeterminate).toBe(true);
    checkbox.indeterminate = false;
    expect(checkbox.indeterminate).toBe(false);
  });

  it("keeps an indeterminate property set before the element connects", () => {
    const checkbox = document.createElement(TEST_TAG);
    checkbox.indeterminate = true;
    document.body.appendChild(checkbox);

    expect(checkbox.indeterminate).toBe(true);
  });

  it("clears indeterminate on click and reports the new checked value", () => {
    const { checkbox, input } = mountCheckbox({ indeterminate: "" });
    const values = [];
    checkbox.addEventListener("value-change", (event) => {
      values.push(event.detail.value);
    });

    input.click();

    expect(checkbox.indeterminate).toBe(false);
    expect(checkbox.checked).toBe(true);
    expect(values).toEqual([true]);
  });

  it("resets checked and indeterminate from attributes when key changes", () => {
    const { checkbox, input } = mountCheckbox({
      checked: "",
      indeterminate: "",
      key: "a",
    });

    input.click();
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(false);

    checkbox.setAttribute("key", "b");

    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(true);
  });

  it("restores indeterminate from the attribute when it reconnects", () => {
    const { checkbox, input } = mountCheckbox({ indeterminate: "" });

    input.click();
    expect(input.indeterminate).toBe(false);

    document.body.appendChild(document.createElement("div")).appendChild(checkbox);

    expect(input.indeterminate).toBe(true);
  });

  it("sizes the box with s and keeps the shared inset focus ring", () => {
    const { checkbox } = mountCheckbox();
    const cssText = checkbox.shadowRoot.adoptedStyleSheets[0].cssText;

    expect(cssText).toMatch(/:host\(\[s="sm"\]\)\s*\{\s*--checkbox-size:\s*14px;/);
    expect(cssText).toMatch(/:host\(\[s="lg"\]\)\s*\{\s*--checkbox-size:\s*20px;/);
    expect(cssText).toMatch(/:host\s*\{[^}]*--checkbox-size:\s*16px;/);
    expect(cssText).toContain("box-shadow: inset 0 0 0 2px var(--ring);");
  });

  const ruleFor = (cssText, selector) => {
    const start = cssText.indexOf(`${selector} {`);
    return start === -1 ? "" : cssText.slice(start, cssText.indexOf("}", start));
  };

  it("sizes the native input with wh and centers the label on that height", () => {
    const { checkbox } = mountCheckbox({ wh: "28" });
    const cssText = checkbox.shadowRoot.querySelector("style").textContent;
    const inputRule = ruleFor(cssText, 'input[type="checkbox"]');
    const controlRule = ruleFor(cssText, ".checkbox-control");

    expect(inputRule).toContain("min-width: 28px");
    expect(inputRule).toContain("min-height: 28px");
    expect(controlRule).toContain("--checkbox-box-height: 28px");
    expect(checkbox.shadowRoot.adoptedStyleSheets[0].cssText).toContain(
      "margin-top: calc((1lh - var(--checkbox-box-height, var(--checkbox-size))) / 2);",
    );
  });

  it("applies op, z, hide, and show to the box and its mark together", () => {
    const { checkbox } = mountCheckbox({ op: "0.4", z: "2", hide: "", "md-show": "" });
    const cssText = checkbox.shadowRoot.querySelector("style").textContent;
    const controlRule = ruleFor(cssText, ".checkbox-control");
    const inputRule = ruleFor(cssText, 'input[type="checkbox"]');

    expect(controlRule).toContain("opacity: 0.4");
    expect(controlRule).toContain("z-index: 2");
    expect(controlRule).toContain("display: none");
    expect(cssText).toContain("display: inline-flex !important");
    expect(inputRule).toBe("");
  });
});
