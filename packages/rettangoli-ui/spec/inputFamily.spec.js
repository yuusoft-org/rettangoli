// @vitest-environment jsdom
// Characterizes the text-field primitives that share code: rtgl-input,
// rtgl-input-number, rtgl-textarea, and rtgl-input-date/-time/-datetime, which
// are rtgl-input with a fixed type. Check reads `observedAttributes`, and
// consumer shims wrap methods on these prototypes, so both are pinned here.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import createInput from "../src/primitives/input.js";
import createInputDate from "../src/primitives/input-date.js";
import createInputDateTime from "../src/primitives/input-datetime.js";
import createInputNumber from "../src/primitives/input-number.js";
import createInputTime from "../src/primitives/input-time.js";
import createTextarea from "../src/primitives/textarea.js";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

const FACTORIES = {
  "rtgl-input": createInput,
  "rtgl-input-date": createInputDate,
  "rtgl-input-time": createInputTime,
  "rtgl-input-datetime": createInputDateTime,
  "rtgl-input-number": createInputNumber,
  "rtgl-textarea": createTextarea,
};

const FORCED_TYPES = {
  "rtgl-input-date": "date",
  "rtgl-input-time": "time",
  "rtgl-input-datetime": "datetime-local",
};

const mount = (tag, attributes = {}) => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  document.body.appendChild(element);
  return element;
};

const control = (element) => element.shadowRoot.querySelector("input, textarea");
const styleText = (element) => element.shadowRoot.querySelector("style").textContent;

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);
  vi.stubGlobal("requestAnimationFrame", (callback) => {
    callback(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  Object.entries(FACTORIES).forEach(([tag, factory]) => {
    customElements.define(tag, factory({}));
  });
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("input family classes", () => {
  it("keep their constructor names", () => {
    expect(Object.fromEntries(
      Object.keys(FACTORIES).map((tag) => [tag, customElements.get(tag).name]),
    )).toEqual({
      "rtgl-input": "RettangoliInputElement",
      "rtgl-input-date": "RettangoliInputDateElement",
      "rtgl-input-time": "RettangoliInputTimeElement",
      "rtgl-input-datetime": "RettangoliInputDateTimeElement",
      "rtgl-input-number": "RettangoliInputNumberElement",
      "rtgl-textarea": "RettangoliTextAreaElement",
    });
  });

  it("keep today's observedAttributes", async () => {
    const observed = Object.fromEntries(
      Object.keys(FACTORIES).map((tag) => [tag, customElements.get(tag).observedAttributes]),
    );
    for (const tag of Object.keys(FORCED_TYPES)) {
      expect(observed[tag], tag).toEqual(observed["rtgl-input"]);
    }
    await expect(`${JSON.stringify(observed, null, 1)}\n`).toMatchFileSnapshot(
      "__snapshots__/inputFamily.observedAttributes.json",
    );
  });

  it("return the same class from every factory call", () => {
    Object.entries(FACTORIES).forEach(([tag, factory]) => {
      expect(factory({}), tag).toBe(customElements.get(tag));
    });
  });

  it("make the date, time and datetime classes subclasses of rtgl-input", () => {
    const Input = customElements.get("rtgl-input");
    for (const tag of Object.keys(FORCED_TYPES)) {
      expect(customElements.get(tag).prototype instanceof Input, tag).toBe(true);
    }
  });

  it("keep the internal methods that consumer shims wrap reachable on each prototype", () => {
    const methods = [
      "updateStyles",
      "_setOrRemoveInputAttribute",
      "_syncPlaceholderAttribute",
      "_syncValueAttribute",
      "_updateInputAttributes",
    ];
    for (const tag of ["rtgl-input", "rtgl-input-number", ...Object.keys(FORCED_TYPES)]) {
      for (const method of methods) {
        expect(typeof customElements.get(tag).prototype[method], `${tag}.${method}`).toBe("function");
      }
    }
  });

  it("run a wrapper installed on rtgl-input's _updateInputAttributes for the date, time and datetime tags", () => {
    // An app's rtglInput shim wraps this method to forward data-maxlength.
    const { prototype } = customElements.get("rtgl-input");
    const original = prototype._updateInputAttributes;
    const calls = [];
    prototype._updateInputAttributes = function (...args) {
      calls.push(this.localName);
      return original.apply(this, args);
    };
    try {
      for (const tag of ["rtgl-input", ...Object.keys(FORCED_TYPES)]) {
        const element = mount(tag);
        element.setAttribute("disabled", "");
        expect(control(element).hasAttribute("disabled"), tag).toBe(true);
      }
    } finally {
      prototype._updateInputAttributes = original;
    }
    // The forced-type tags also run it when connect sets their type.
    expect(calls).toEqual([
      "rtgl-input", "rtgl-input",
      "rtgl-input-date", "rtgl-input-date", "rtgl-input-date",
      "rtgl-input-time", "rtgl-input-time", "rtgl-input-time",
      "rtgl-input-datetime", "rtgl-input-datetime", "rtgl-input-datetime",
    ]);
  });
});

describe("rtgl-input-date, -time and -datetime", () => {
  it.each(Object.entries(FORCED_TYPES))("%s forces type %s on connect", (tag, type) => {
    const element = document.createElement(tag);
    element.setAttribute("type", "password");
    expect(element.getAttribute("type")).toBe(type);
    document.body.appendChild(element);
    expect(element.getAttribute("type")).toBe(type);
    expect(control(element).getAttribute("type")).toBe(type);

    const bare = mount(tag);
    expect(bare.getAttribute("type")).toBe(type);
    expect(control(bare).getAttribute("type")).toBe(type);
  });

  it.each(Object.entries(FORCED_TYPES))("%s re-asserts type %s when type changes or is removed", (tag, type) => {
    const element = mount(tag);
    element.setAttribute("type", "text");
    expect(element.getAttribute("type")).toBe(type);
    expect(control(element).getAttribute("type")).toBe(type);

    element.removeAttribute("type");
    expect(element.getAttribute("type")).toBe(type);
    expect(control(element).getAttribute("type")).toBe(type);

    element.setAttribute("type", type);
    expect(control(element).getAttribute("type")).toBe(type);
  });

  it.each(Object.keys(FORCED_TYPES))("%s forwards the other rtgl-input attributes", (tag) => {
    const element = mount(tag, { min: "2024-01-01", max: "null", step: "2", placeholder: "When" });
    const input = control(element);
    expect(input.getAttribute("min")).toBe("2024-01-01");
    expect(input.hasAttribute("max")).toBe(false);
    expect(input.getAttribute("step")).toBe("2");
    expect(input.getAttribute("placeholder")).toBe("When");

    element.setAttribute("aria-label", "Date");
    expect(input.getAttribute("aria-label")).toBe("Date");
    element.setAttribute("w", "200");
    expect(styleText(element)).toBe(styleText(mount("rtgl-input", { w: "200" })));
  });

  it("emit value-input and value-change with the native value", () => {
    const element = mount("rtgl-input-date");
    const events = [];
    element.addEventListener("value-input", (event) => events.push(["input", event.detail]));
    element.addEventListener("value-change", (event) => events.push(["change", event.detail]));
    control(element).value = "2024-02-03";
    control(element).dispatchEvent(new Event("input"));
    control(element).dispatchEvent(new Event("change"));
    expect(events).toEqual([
      ["input", { value: "2024-02-03" }],
      ["change", { value: "2024-02-03" }],
    ]);
  });
});

describe("value and focus pass through to the native control", () => {
  const VALUES = {
    "rtgl-input": "hello",
    "rtgl-input-date": "2024-02-03",
    "rtgl-input-time": "12:34",
    "rtgl-input-datetime": "2024-02-03T12:34",
    "rtgl-input-number": "42",
    "rtgl-textarea": "line one\nline two",
  };

  it.each(Object.entries(VALUES))("%s value property reads and writes the native value", (tag, value) => {
    const element = mount(tag);
    element.value = value;
    expect(control(element).value).toBe(value);
    control(element).value = "";
    expect(element.value).toBe("");
  });

  it.each(Object.keys(VALUES))("%s focus() focuses the native control", (tag) => {
    const element = mount(tag);
    element.focus();
    expect(element.shadowRoot.activeElement).toBe(control(element));
  });

  it("rtgl-textarea select() selects the native text", () => {
    const element = mount("rtgl-textarea");
    element.value = "abc";
    element.select();
    expect([control(element).selectionStart, control(element).selectionEnd]).toEqual([0, 3]);
  });

  it.each([
    ["rtgl-input", "typed", "typed"],
    ["rtgl-input-number", "15", "15"],
  ])("%s value attribute syncs into the native value", (tag, value, expected) => {
    const element = mount(tag, { value });
    expect(control(element).value).toBe(expected);
    element.removeAttribute("value");
    expect(control(element).value).toBe("");
  });
});

describe("rtgl-input and rtgl-input-number shared attribute handling", () => {
  it.each(["rtgl-input", "rtgl-input-number"])("%s forwards placeholder and removes it for null or \"null\"", (tag) => {
    const element = mount(tag, { placeholder: "Type" });
    const input = control(element);
    expect(input.getAttribute("placeholder")).toBe("Type");
    element.setAttribute("placeholder", "null");
    expect(input.hasAttribute("placeholder")).toBe(false);
    element.setAttribute("placeholder", "");
    expect(input.getAttribute("placeholder")).toBe("");
    element.removeAttribute("placeholder");
    expect(input.hasAttribute("placeholder")).toBe(false);
  });

  it.each(["rtgl-input", "rtgl-input-number"])("%s forwards min, max, step and removes \"null\" values", (tag) => {
    const element = mount(tag, { min: "1", max: "9", step: "0.5" });
    const input = control(element);
    expect([input.getAttribute("min"), input.getAttribute("max"), input.getAttribute("step")])
      .toEqual(["1", "9", "0.5"]);
    element.setAttribute("min", "null");
    element.removeAttribute("step");
    expect(input.hasAttribute("min")).toBe(false);
    expect(input.hasAttribute("step")).toBe(false);
    expect(input.getAttribute("max")).toBe("9");
  });

  it("rtgl-input keeps the allowed types and falls back to text", () => {
    const element = mount("rtgl-input", { type: "password" });
    expect(control(element).getAttribute("type")).toBe("password");
    element.setAttribute("type", "number");
    expect(control(element).getAttribute("type")).toBe("text");
    element.setAttribute("type", "datetime-local");
    expect(control(element).getAttribute("type")).toBe("datetime-local");
  });

  it("rtgl-input-number always uses a number input", () => {
    const element = mount("rtgl-input-number", { type: "text" });
    expect(control(element).getAttribute("type")).toBe("number");
  });

  it.each([
    [{}, ""],
    [{ w: "f" }, "input{width:var(--width-stretch)!important;min-width:unset!important;max-width:unset!important;}"],
    [{ w: "200", h: "40" }, "input{width:200px!important;min-width:200px!important;max-width:200px!important;height:40px!important;min-height:40px!important;max-height:40px!important;}"],
    [{ wh: "f" }, "input{width:var(--width-stretch)!important;min-width:unset!important;max-width:unset!important;height:100%!important;min-height:unset!important;max-height:unset!important;}"],
    [{ hide: "", "sm-show": "", op: "0.5", z: "3" }, "input{z-index:3!important;opacity:0.5!important;display:none!important;}@mediaonlyscreenand(max-width:640px){input{display:block!important;}}"],
    [{ "md-w": "120", "lg-wh": "f", "xl-hide": "" }, "@mediaonlyscreenand(max-width:1280px){input{display:none!important;}}@mediaonlyscreenand(max-width:1024px){input{width:var(--width-stretch)!important;min-width:unset!important;max-width:unset!important;height:100%!important;min-height:unset!important;max-height:unset!important;}}@mediaonlyscreenand(max-width:768px){input{width:120px!important;min-width:120px!important;max-width:120px!important;}}"],
  ])("rtgl-input and rtgl-input-number build the same responsive styles for %j", (attributes, expected) => {
    const input = mount("rtgl-input", attributes);
    const number = mount("rtgl-input-number", attributes);
    expect(styleText(number)).toBe(styleText(input));
    expect(styleText(input).replace(/\s+/g, "")).toBe(expected);
  });

  it.each(["rtgl-input", "rtgl-input-number"])("%s rewrites styles only when the text changes", (tag) => {
    const element = mount(tag, { w: "100" });
    const style = element.shadowRoot.querySelector("style");
    const before = style.textContent;
    let writes = 0;
    const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
    Object.defineProperty(style, "textContent", {
      configurable: true,
      get: () => descriptor.get.call(style),
      set: (value) => {
        writes += 1;
        descriptor.set.call(style, value);
      },
    });
    element.setAttribute("mt", "md");
    expect(writes).toBe(0);
    element.setAttribute("w", "120");
    expect(writes).toBe(1);
    expect(style.textContent).not.toBe(before);
  });
});
