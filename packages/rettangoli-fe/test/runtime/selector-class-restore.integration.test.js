// @vitest-environment jsdom
/**
 * Selector classes (`div.card`) stay on an element that the patch keeps when
 * its class= attribute goes away. The attribute held the selector classes
 * too, so removing it used to strip them, and the class module saw nothing to
 * put back.
 */
import { describe, expect, it } from "vitest";
import { parse } from "jempl";
import { h } from "snabbdom/build/h.js";
import createWebPatch from "../../src/createWebPatch.js";
import { parseView } from "../../src/parser.js";

// Patches the same template with each view data in turn and returns the
// element's class list after every step, plus whether the element was kept.
const classesAcross = (template, steps) => {
  const parsed = parse(template);
  const patch = createWebPatch();
  let vnode = patch(document.createElement("div"), parseView({ h, template: parsed, viewData: steps[0] }));
  const first = vnode.elm.firstElementChild;
  const lists = [[...first.classList]];
  for (const viewData of steps.slice(1)) {
    vnode = patch(vnode, parseView({ h, template: parsed, viewData }));
    lists.push([...vnode.elm.firstElementChild.classList]);
  }
  return { lists, kept: vnode.elm.firstElementChild === first };
};

describe("selector classes when class= goes away", () => {
  it("keeps them when $if switches from `div.card class=x` to `div.card` at the same key", () => {
    const template = [{
      "$if highlighted": [{ 'div.card class="x"': "" }],
      $else: [{ "div.card": "" }],
    }];
    expect(classesAcross(template, [{ highlighted: true }, { highlighted: false }, { highlighted: true }]))
      .toEqual({ lists: [["card", "x"], ["card"], ["card", "x"]], kept: true });
  });

  it("keeps them when a bare ${attrs} fragment stops emitting class=", () => {
    const template = [{ "div.base ${extra}": "" }];
    expect(classesAcross(template, [{ extra: "class=hl" }, { extra: "" }, { extra: "title=t" }, { extra: "class=hl" }]))
      .toEqual({ lists: [["base", "hl"], ["base"], ["base"], ["base", "hl"]], kept: true });
  });

  it("keeps every selector class and leaves the other attributes alone", () => {
    const template = [{ "div.a.b ${extra}": "" }];
    const patch = createWebPatch();
    const parsed = parse(template);
    let vnode = patch(document.createElement("div"), parseView({ h, template: parsed, viewData: { extra: 'class="c" title=t' } }));
    vnode = patch(vnode, parseView({ h, template: parsed, viewData: { extra: "title=t" } }));
    expect(vnode.elm.innerHTML).toBe('<div title="t" class="a b"></div>');
  });

  it("adds selector classes of an element that gains them while its class= goes away", () => {
    const template = [{
      "$if on": [{ 'div#box class="x"': "" }],
      $else: [{ "div#box.card": "" }],
    }];
    expect(classesAcross(template, [{ on: true }, { on: false }]))
      .toEqual({ lists: [["x"], ["card"]], kept: true });
  });

  it("does the same on a custom element", () => {
    const template = [{ "x-w.card ${extra}": "" }];
    expect(classesAcross(template, [{ extra: "class=hl" }, { extra: "" }]))
      .toEqual({ lists: [["card", "hl"], ["card"]], kept: true });
  });

  it("still drops classes that only class= gave", () => {
    const template = [{ "div ${extra}": "" }];
    expect(classesAcross(template, [{ extra: "class=hl" }, { extra: "" }]))
      .toEqual({ lists: [["hl"], []], kept: true });
  });

  it("still follows class= changes that keep the attribute", () => {
    const template = [{ "div.card class=${c}": "" }];
    expect(classesAcross(template, [{ c: "x" }, { c: "y" }, { c: "" }]))
      .toEqual({ lists: [["card", "x"], ["card", "y"], ["card"]], kept: true });
  });
});
