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

import createInputDuration from "../src/primitives/input-duration.js";

const TEST_TAG = "rtgl-input-duration-primitive-test";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createInputDuration({}));
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const createDurationInput = (attrs = {}) => {
  const durationInput = document.createElement(TEST_TAG);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === true) {
      durationInput.setAttribute(name, "");
    } else {
      durationInput.setAttribute(name, String(value));
    }
  }
  document.body.appendChild(durationInput);
  return {
    durationInput,
    nativeInput: durationInput.shadowRoot.querySelector("input"),
  };
};

const dispatchNativeEvent = (target, type) => {
  target.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
};

describe("rtgl-input-duration primitive", () => {
  it("formats millisecond attributes and keeps input attributes reactive", () => {
    const { durationInput, nativeInput } = createDurationInput({
      disabled: true,
      value: 190000,
    });

    expect(durationInput.value).toBe(190000);
    expect(nativeInput.value).toBe("3:10");
    expect(nativeInput.type).toBe("text");
    expect(nativeInput.placeholder).toBe("m:ss");
    expect(nativeInput.disabled).toBe(true);

    durationInput.setAttribute("value", "3723045");
    durationInput.setAttribute("placeholder", "hh:mm:ss");
    durationInput.removeAttribute("disabled");

    expect(durationInput.value).toBe(3723045);
    expect(nativeInput.value).toBe("1:02:03.045");
    expect(nativeInput.placeholder).toBe("hh:mm:ss");
    expect(nativeInput.disabled).toBe(false);

    durationInput.value = 125500;
    expect(durationInput.value).toBe(125500);
    expect(nativeInput.value).toBe("2:05.5");
  });

  it("emits numeric live and committed values and normalizes on commit", () => {
    const { durationInput, nativeInput } = createDurationInput({ value: 190000 });
    const inputEvents = [];
    const changeEvents = [];
    durationInput.addEventListener("value-input", (event) => {
      inputEvents.push(event);
    });
    durationInput.addEventListener("value-change", (event) => {
      changeEvents.push(event);
    });

    nativeInput.value = "4:5";
    dispatchNativeEvent(nativeInput, "input");

    expect(inputEvents).toHaveLength(1);
    expect(inputEvents[0].detail).toEqual({ value: 245000 });
    expect(inputEvents[0].bubbles).toBe(true);
    expect(nativeInput.value).toBe("4:5");

    dispatchNativeEvent(nativeInput, "change");

    expect(changeEvents).toHaveLength(1);
    expect(changeEvents[0].detail).toEqual({ value: 245000 });
    expect(nativeInput.value).toBe("4:05");
    expect(durationInput.value).toBe(245000);
  });

  it("uses null for empty input", () => {
    const { durationInput, nativeInput } = createDurationInput({ value: 190000 });
    const values = [];
    durationInput.addEventListener("value-input", (event) => {
      values.push(event.detail.value);
    });

    nativeInput.value = "";
    dispatchNativeEvent(nativeInput, "input");

    expect(values).toEqual([null]);
    expect(durationInput.value).toBeNull();
    expect(nativeInput.value).toBe("");
  });

  it("ignores invalid partial input and restores the last committed value", () => {
    const { durationInput, nativeInput } = createDurationInput({ value: 190000 });
    const inputValues = [];
    const changeValues = [];
    durationInput.addEventListener("value-input", (event) => {
      inputValues.push(event.detail.value);
    });
    durationInput.addEventListener("value-change", (event) => {
      changeValues.push(event.detail.value);
    });

    nativeInput.value = "3:7";
    dispatchNativeEvent(nativeInput, "input");
    nativeInput.value = "3:75";
    dispatchNativeEvent(nativeInput, "input");

    expect(inputValues).toEqual([187000]);
    expect(durationInput.value).toBe(187000);
    expect(nativeInput.value).toBe("3:75");

    dispatchNativeEvent(nativeInput, "change");

    expect(changeValues).toEqual([190000]);
    expect(durationInput.value).toBe(190000);
    expect(nativeInput.value).toBe("3:10");
  });

  it("clamps committed values to millisecond bounds", () => {
    const { durationInput, nativeInput } = createDurationInput({
      max: 300000,
      min: 60000,
      value: 190000,
    });
    const changes = [];
    durationInput.addEventListener("value-change", (event) => {
      changes.push(event.detail.value);
    });

    nativeInput.value = "0:30";
    dispatchNativeEvent(nativeInput, "change");
    expect(nativeInput.value).toBe("1:00");
    expect(durationInput.value).toBe(60000);

    nativeInput.value = "10:00";
    dispatchNativeEvent(nativeInput, "change");
    expect(nativeInput.value).toBe("5:00");
    expect(durationInput.value).toBe(300000);
    expect(changes).toEqual([60000, 300000]);
  });

  it("commits on Enter before an enclosing form handles the key", () => {
    const { durationInput, nativeInput } = createDurationInput({ value: 190000 });
    const changes = [];
    durationInput.addEventListener("value-change", (event) => {
      changes.push(event.detail.value);
    });

    nativeInput.value = "1:2";
    nativeInput.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      composed: true,
      key: "Enter",
    }));

    expect(changes).toEqual([62000]);
    expect(durationInput.value).toBe(62000);
    expect(nativeInput.value).toBe("1:02");
  });

  it("increments and decrements by the millisecond step", () => {
    const { durationInput, nativeInput } = createDurationInput({
      min: 0,
      step: 5000,
      value: 190000,
    });
    const inputValues = [];
    const changeValues = [];
    durationInput.addEventListener("value-input", (event) => {
      inputValues.push(event.detail.value);
    });
    durationInput.addEventListener("value-change", (event) => {
      changeValues.push(event.detail.value);
    });

    nativeInput.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "ArrowUp",
    }));
    nativeInput.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "ArrowDown",
    }));

    expect(inputValues).toEqual([195000, 190000]);
    expect(changeValues).toEqual([195000, 190000]);
    expect(nativeInput.value).toBe("3:10");
    expect(durationInput.value).toBe(190000);
  });
});
