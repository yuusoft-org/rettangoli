/**
 * Pins the behaviour of the vendored snabbdom style module.
 *
 * The vendored copy exists only so the package imports in Node; its runtime
 * behaviour in a browser must stay byte-equivalent to upstream. If snabbdom is
 * upgraded, these tests are what tell you whether the copy still matches.
 */

import { describe, expect, it } from "vitest";
import { styleModule } from "../../src/web/vendor/snabbdomStyleModule.js";

/** Minimal stand-in for an element's CSSStyleDeclaration. */
const createElementStub = () => ({
  style: {
    custom: {},
    setProperty(name, value) {
      this.custom[name] = value;
    },
    removeProperty(name) {
      delete this.custom[name];
    },
  },
});

const applied = (elm) =>
  Object.fromEntries(
    Object.entries(elm.style).filter(
      ([key, value]) => key !== "custom" && typeof value !== "function",
    ),
  );

const update = (oldStyle, newStyle) => {
  const elm = createElementStub();
  styleModule.update({ data: { style: oldStyle } }, { data: { style: newStyle }, elm });
  return { direct: applied(elm), custom: elm.style.custom };
};

describe("vendored style module", () => {
  it("imports without a DOM — the reason it is vendored at all", () => {
    expect(typeof globalThis.window).toBe("undefined");
    expect(typeof styleModule).toBe("object");
  });

  it("exposes the same hook set as upstream", () => {
    expect(Object.keys(styleModule).sort()).toEqual(
      ["create", "destroy", "pre", "remove", "update"].sort(),
    );
  });

  it("applies new declarations", () => {
    expect(update({}, { color: "red" }).direct).toEqual({ color: "red" });
  });

  it("clears declarations that were removed", () => {
    expect(update({ color: "red" }, {}).direct).toEqual({ color: "" });
  });

  it("routes custom properties through setProperty/removeProperty", () => {
    expect(update({}, { "--x": "1" }).custom).toEqual({ "--x": "1" });
    expect(update({ "--x": "1" }, {}).custom).toEqual({});
  });

  it("updates only changed declarations", () => {
    expect(update({ a: "1", b: "2" }, { b: "3" })).toEqual({
      direct: { a: "", b: "3" },
      custom: {},
    });
  });

  it("does nothing when both sides are absent or identical", () => {
    const elm = createElementStub();
    styleModule.update({ data: {} }, { data: {}, elm });
    expect(applied(elm)).toEqual({});

    const shared = { color: "red" };
    const elm2 = createElementStub();
    styleModule.update({ data: { style: shared } }, { data: { style: shared }, elm: elm2 });
    expect(applied(elm2)).toEqual({});
  });

  it("applies destroy styles", () => {
    const elm = createElementStub();
    styleModule.destroy({ data: { style: { destroy: { opacity: "0" } } }, elm });
    expect(applied(elm)).toEqual({ opacity: "0" });
  });

  it("calls the remove callback immediately when there is no remove style", () => {
    let called = false;
    styleModule.remove({ data: { style: {} }, elm: createElementStub() }, () => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it("defers `delayed` declarations rather than applying them synchronously", () => {
    const elm = createElementStub();
    styleModule.update(
      { data: { style: {} } },
      { data: { style: { delayed: { opacity: "1" } } }, elm },
    );
    // Deferred via the rAF/setTimeout path, so not visible on this tick.
    expect(applied(elm)).toEqual({});
  });
});
