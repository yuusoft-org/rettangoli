import { describe, expect, it } from "vitest";

import {
  DROPDOWN_POPOVER_ATTR_PROPS,
  getOptionIcon,
  getOptionImageSrc,
  getOptionSuffixText,
  getOptionType,
  hasResolvedValue,
  isSelectableOption,
  normalizeSelectedValues,
  resolveCurrentValues,
  resolvePopoverPosition,
  resolveSelectedValue,
  stringifyPopoverAttrs,
} from "../src/common/choice.js";

describe("option helpers", () => {
  it("treats every option that is not a section or separator as an item", () => {
    expect(getOptionType({ type: "section" })).toBe("section");
    expect(getOptionType({ type: "separator" })).toBe("separator");
    expect(getOptionType({ type: "label" })).toBe("item");
    expect(getOptionType({ type: "item" })).toBe("item");
    expect(getOptionType({})).toBe("item");
    expect(getOptionType()).toBe("item");

    expect(isSelectableOption({ value: 1 })).toBe(true);
    expect(isSelectableOption({ type: "section" })).toBe(false);
    expect(isSelectableOption({ type: "separator" })).toBe(false);
  });

  it("reads the icon and image only from non-empty strings", () => {
    expect(getOptionIcon({ icon: "star" })).toBe("star");
    expect(getOptionIcon({ icon: "" })).toBe("");
    expect(getOptionIcon({ icon: 3 })).toBe("");
    expect(getOptionIcon()).toBe("");

    expect(getOptionImageSrc({ imageSrc: "/a.png" })).toBe("/a.png");
    expect(getOptionImageSrc({ imageSrc: " /a.png " })).toBe(" /a.png ");
    expect(getOptionImageSrc({ imageSrc: "   " })).toBe("");
    expect(getOptionImageSrc({ imageSrc: 3 })).toBe("");
    expect(getOptionImageSrc()).toBe("");
  });

  it("prefers a non-empty shortcut over suffixText", () => {
    expect(getOptionSuffixText({ shortcut: "⌘K", suffixText: "New" })).toBe("⌘K");
    expect(getOptionSuffixText({ shortcut: "", suffixText: "New" })).toBe("New");
    expect(getOptionSuffixText({ shortcut: 1, suffixText: "New" })).toBe("New");
    expect(getOptionSuffixText({ suffixText: "" })).toBe("");
    expect(getOptionSuffixText()).toBe("");
  });
});

describe("normalizeSelectedValues", () => {
  it("returns a copy of an array and [] for anything else", () => {
    const values = [1, { id: 2 }];
    const result = normalizeSelectedValues(values);

    expect(result).toEqual(values);
    expect(result).not.toBe(values);
    expect(normalizeSelectedValues(undefined)).toEqual([]);
    expect(normalizeSelectedValues(null)).toEqual([]);
    expect(normalizeSelectedValues("ab")).toEqual([]);
    expect(normalizeSelectedValues({ length: 1, 0: "a" })).toEqual([]);
  });
});

describe("resolveCurrentValues", () => {
  const createStore = (hasSelectedValues, selectedValues) => ({
    selectHasSelectedValues: () => hasSelectedValues,
    selectSelectedValues: () => selectedValues,
  });

  it("uses the store values once the store holds values", () => {
    const props = { selectedValues: ["prop"] };

    expect(resolveCurrentValues({ store: createStore(true, ["own"]), props })).toEqual(["own"]);
    expect(resolveCurrentValues({ store: createStore(true, undefined), props })).toEqual([]);
  });

  it("uses a copy of the selectedValues prop until then", () => {
    const selectedValues = ["prop"];
    const result = resolveCurrentValues({
      store: createStore(false, ["own"]),
      props: { selectedValues },
    });

    expect(result).toEqual(["prop"]);
    expect(result).not.toBe(selectedValues);
    expect(resolveCurrentValues({ store: createStore(false, []), props: {} })).toEqual([]);
    expect(resolveCurrentValues({ store: {}, props: { selectedValues: ["prop"] } })).toEqual(["prop"]);
  });
});

describe("resolvePopoverPosition", () => {
  it("opens 12px below the trigger and at least 240px wide", () => {
    const trigger = {
      getBoundingClientRect: () => ({ left: 10.4, bottom: 20.6, width: 100 }),
    };

    expect(resolvePopoverPosition(trigger)).toEqual({ x: 10, y: 33, w: 240 });
    expect(
      resolvePopoverPosition({
        getBoundingClientRect: () => ({ left: 0, bottom: 0, width: 300.5 }),
      }),
    ).toEqual({ x: 0, y: 12, w: 301 });
  });

  it("returns the fallback, undefined by default, without a measurable trigger", () => {
    expect(resolvePopoverPosition(undefined)).toBeUndefined();
    expect(resolvePopoverPosition({})).toBeUndefined();
    expect(resolvePopoverPosition(null, null)).toBeNull();
    expect(resolvePopoverPosition({ getBoundingClientRect: 1 }, null)).toBeNull();
  });
});

describe("resolveSelectedValue / hasResolvedValue", () => {
  it("shows a defined selectedValue prop, null included", () => {
    const state = { hasLocalValue: true, selectedValue: "own", hasSelectedValue: true };

    expect(resolveSelectedValue({ state, props: { selectedValue: "prop" } })).toBe("prop");
    expect(resolveSelectedValue({ state, props: { selectedValue: null } })).toBeNull();
    expect(hasResolvedValue({ state, props: { selectedValue: null } })).toBe(true);
  });

  it("shows the local pick only while the prop is undefined", () => {
    const local = { hasLocalValue: true, selectedValue: "own", hasSelectedValue: true };
    const cleared = { hasLocalValue: true, selectedValue: undefined, hasSelectedValue: false };
    const fromProps = { hasLocalValue: false, selectedValue: "stored" };

    expect(resolveSelectedValue({ state: local, props: {} })).toBe("own");
    expect(hasResolvedValue({ state: local, props: {} })).toBe(true);
    expect(hasResolvedValue({ state: cleared, props: {} })).toBe(false);
    expect(resolveSelectedValue({ state: fromProps, props: {} })).toBeUndefined();
    expect(hasResolvedValue({ state: fromProps, props: {} })).toBe(false);
  });
});

describe("stringifyPopoverAttrs", () => {
  it("writes the defined dropdown popover props in list order", () => {
    expect(
      stringifyPopoverAttrs({
        mdPlace: 'b"e',
        overlay: true,
        smNoOverlay: false,
        lgPlace: null,
        xlPlace: undefined,
        dir: "rtl",
      }),
    ).toBe('overlay md-place="b&quot;e" sm-no-overlay="false"');
    expect(stringifyPopoverAttrs()).toBe("");
  });

  it("uses the given attribute list", () => {
    const attrProps = [...DROPDOWN_POPOVER_ATTR_PROPS, ["dir", "dir"]];

    expect(stringifyPopoverAttrs({ dir: "rtl", noOverlay: true }, attrProps)).toBe(
      'no-overlay dir="rtl"',
    );
  });
});
